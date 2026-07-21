import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Sidebar({ links = [], userRole = 'Panitia' }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Hapus token / session jika ada
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Arahkan kembali ke halaman login
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#080d1a]/80 backdrop-blur-md min-h-screen p-5 flex flex-col justify-between shrink-0 hidden md:flex border-r border-slate-800/20 text-slate-200">
      <div className="flex flex-col gap-6">
        {/* Brand / Logo App */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            D
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white leading-none">DCC CBT</h1>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase">{userRole} Panel</span>
          </div>
        </div>

        {/* Menu Links */}
        <nav className="flex flex-col gap-1.5">
          {links.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`
              }
            >
              {item.icon && <span className="text-lg">{item.icon}</span>}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Profile & Logout Section */}
      <div className="pt-4 border-t border-slate-800/40 flex flex-col gap-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
        >
          <span>🚪</span>
          <span>Keluar / Logout</span>
        </button>
      </div>
    </aside>
  );
}