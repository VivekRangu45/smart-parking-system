import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './ReAuthModal.css';

export default function ReAuthModal({ isOpen, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { reauthenticate } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await reauthenticate(password);
      setPassword('');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reauth-modal-overlay">
      <div className="reauth-modal">
        <div className="reauth-header">
          <h2>Security Verification</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="reauth-body">
          <p>Please enter your password to confirm this action.</p>
          {error && <div className="reauth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="verify-password">Password</label>
              <input
                id="verify-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="reauth-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
