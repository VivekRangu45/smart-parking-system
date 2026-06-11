import axios from 'axios';
import { auth } from './firebase.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Socket.IO connection options with Firebase auth token */
export async function getSocketOptions() {
  const currentUser = auth.currentUser;
  const options = { transports: ['websocket', 'polling'] };
  if (currentUser) {
    const token = await currentUser.getIdToken();
    options.auth = { token };
  }
  return options;
}

export { api, API_URL, SOCKET_URL };
export default api;
