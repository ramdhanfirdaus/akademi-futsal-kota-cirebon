import axios from 'axios';
import { store } from '@/store';
import { clearAuth } from '@/store/slices/authSlice';

/** Same-origin API: the session lives in an httpOnly cookie, so no Authorization header is needed. */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const url: string = error.config?.url ?? '';
    if (error.response?.status === 401 && url !== '/login' && url !== '/me') {
      store.dispatch(clearAuth());
    }
    return Promise.reject(error);
  },
);

export default api;
