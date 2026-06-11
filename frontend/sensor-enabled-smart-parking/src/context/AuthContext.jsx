import { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from '../config/firebase.js';
import api from '../config/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const res = await api.get('/users/me');
          setUser({
            id: res.data.id,
            uid: currentUser.uid,
            email: currentUser.email,
            role: res.data.role,
            full_name: res.data.full_name || null,
          });
        } catch (err) {
          console.error('Failed to load user profile from backend:', err);
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            role: 'user',
            full_name: null,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
  const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const registerWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  /**
   * Re-authenticate current user with their password (Firebase Option B).
   * Called before sensitive actions like booking creation.
   * @param {string} password - The user's current password
   */
  const reauthenticate = async (password) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error('No authenticated user found.');
    }
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
  };

  /**
   * Update user's full_name in state after profile update
   */
  const updateFullName = (full_name) => {
    setUser((prev) => (prev ? { ...prev, full_name } : prev));
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    reauthenticate,
    updateFullName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
