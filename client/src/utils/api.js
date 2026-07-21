import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000, // Timeout request max 10 detik
});

// Interceptor Request: Otomatis tempelkan token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor Response: Tangkap error token kadaluarsa (401)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;