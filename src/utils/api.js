import axios from 'axios';

let logoutHandler = null;

export const setLogoutHandler = (fn) => {
  logoutHandler = fn;
};

let toastHandler = null;

export const setToastHandler = (handler) => {
  toastHandler = handler;
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true;

        // ✅ Show dynamic toast
        if (toastHandler) {
          const message =
            error.response?.data?.message ||
            "Session expired. Please login again.";

          toastHandler(message, "error");
        }

        // ✅ Logout silently
        if (logoutHandler) {
          logoutHandler(true);
        }
        setTimeout(() => {
            window.location.replace("/login");
          }, 2000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;