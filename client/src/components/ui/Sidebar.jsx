import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CheckSquare, Database, FileBarChart, LogOut } from 'lucide-react';
import { LOGO_URL } from '../../config/brand';

export default function Sidebar({ userRole = 'Panitia' }) {
  const navigate = useNavigate();
  const [logoGagalDimuat, setLogoGagalDimuat] = useState(false);

  // Icon Lucide Modern & Elegan
  const links = [
    { label: 'Koreksi Ujian', path: '/dashboard-panitia', icon: CheckSquare },
    { label: 'Bank Soal', path: '/bank-soal', icon: Database },
    { label: 'Laporan Nilai', path: '/laporan', icon: FileBarChart },
  ];

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#080d1a]/80 backdrop-blur-md min-h-screen p-5 flex flex-col justify-between shrink-0 hidden md:flex border-0 text-slate-200">
      <div className="flex flex-col gap-6">
        {/* Brand / Logo App tanpa background biru menyala & bebas batas kaku */}
        <div className="flex items-center gap-3 px-3 py-2">
          {!logoGagalDimuat ? (
            <img
              src={LOGO_URL}
              alt="Logo Lembaga"
              onError={() => setLogoGagalDimuat(true)}
              className="h-9 w-auto object-contain drop-shadow-md shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400">
              D
            </div>
          )}
          <div>
            <h1 className="font-bold text-base tracking-wide text-white leading-none">DCC CBT</h1>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase">{userRole} PANEL</span>
          </div>
        </div>

        {/* Navigasi Links dengan Icon Modern */}
        <nav className="flex flex-col gap-1.5">
          {links.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`
                }
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout Section dengan Icon Elegant */}
      <div className="pt-4 flex flex-col gap-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Keluar / Logout</span>
        </button>
      </div>
    </aside>
  );
}