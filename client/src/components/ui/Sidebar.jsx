import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ role = 'panitia' }) {
  const location = useLocation();

  // Daftar menu berdasarkan role
  const menuConfig = {
    panitia: [
      { label: 'Dashboard', path: '/panitia' },
      { label: 'Bank Soal', path: '/panitia/bank-soal' },
      { label: 'Kelola Peserta', path: '/panitia/peserta' },
      { label: 'Laporan Nilai', path: '/panitia/laporan' },
    ],
    admin: [
      { label: 'Dashboard Admin', path: '/admin' },
      { label: 'Manajemen User', path: '/admin/users' },
    ],
    peserta: [
      { label: 'Dashboard', path: '/peserta' },
      { label: 'Hasil Ujian', path: '/peserta/hasil' },
    ]
  };

  const currentMenu = menuConfig[role] || menuConfig.panitia;

  return (
    <aside className="w-64 border-r border-customBorder bg-surface h-screen p-4 flex flex-col gap-2 shrink-0">
      <div className="text-lg font-bold px-3 py-2 mb-2 text-customText border-b border-customBorder">
        DCC CBT SYSTEM
      </div>
      
      <nav className="flex flex-col gap-1">
        {currentMenu.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-md font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-customText hover:bg-slate-800'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}