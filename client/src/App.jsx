import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/AppRoutes';

function App() {
  useEffect(() => {
    // 1. Cek apakah ada token valid di localStorage atau sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // 2. Jika token ditemukan dan user berada di halaman login, otomatis bypass ke dashboard
    if (token && window.location.pathname === '/login') {
      window.location.href = '/bank-soal';
    }
  }, []);

  return <RouterProvider router={router} />;
}

export default App;