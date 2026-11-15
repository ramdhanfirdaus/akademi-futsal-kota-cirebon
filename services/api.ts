import axios from 'axios';
import { store } from '@/store';
import { clearAuth } from '@/store/slices/authSlice';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config)    => {
    const state = store.getState();
    const token = state.auth.user?.token || state.auth.tempToken;
    if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response && error.response.status === 401) {
            store.dispatch(clearAuth());
        }
      return Promise.reject(error);
    }
);

export default api;
