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
        
        {/* Brand Header: Logo Proporsional & Tipografi Dual-Tone */}
        <div className="flex items-center gap-3.5 px-2 py-1">
          {!logoGagalDimuat ? (
            <img
              src={LOGO_URL}
              alt="Logo Lembaga"
              onError={() => setLogoGagalDimuat(true)}
              className="h-11 w-auto object-contain shrink-0 filter drop-shadow-[0_2px_8px_rgba(34,211,238,0.25)]"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 shrink-0">
              D
            </div>
          )}

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 leading-none">
              <span className="font-extrabold text-base tracking-tight text-white">DCC</span>
              <span className="font-extrabold text-base tracking-tight text-cyan-400">SISTEM</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-[0.2em] uppercase mt-1">
              {userRole} DASHBOARD
            </span>
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