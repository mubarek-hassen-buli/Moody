import axios from 'axios';
import { useUserStore } from '../store/useUserStore';

// ─────────────────────────────────────────────────────────────────────────────
// AXIOS INSTANCE
// Base URL points to EXPO_PUBLIC_API_URL from .env.
// The request interceptor attaches the Supabase session token on every call.
// ─────────────────────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

// Attach Bearer token from Zustand store on every request
apiClient.interceptors.request.use((config) => {
  const token = useUserStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unified error response handler — surfaces API error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      error.message ??
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
