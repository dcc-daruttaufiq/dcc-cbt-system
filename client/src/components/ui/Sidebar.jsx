import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  CheckSquare,
  Database,
  FileBarChart,
  Sliders,
  LogOut,
} from "lucide-react";
import { LOGO_URL } from "../../config/brand";

// Menu default (dipakai HANYA kalau halaman pemanggil tidak mengirim prop `links`)
const DEFAULT_LINKS = [
  { label: "Dashboard Anggota", path: "/dashboard-anggota", icon: Home },
  { label: "Koreksi Ujian", path: "/ruang-ujian", icon: CheckSquare },
  { label: "Repositori Soal", path: "/bank-soal", icon: Database },
  { label: "Pengaturan Ujian", path: "/pengaturan-ujian", icon: Sliders },
  { label: "Laporan Nilai", path: "/laporan", icon: FileBarChart },
];

export default function Sidebar({ userRole = "Anggota", links }) {
  const navigate = useNavigate();
  const [logoGagalDimuat, setLogoGagalDimuat] = useState(false);

  // Kalau halaman pemanggil kirim prop `links` sendiri, PAKAI ITU.
  // Kalau tidak dikirim sama sekali, baru fallback ke menu default di atas.
  const finalLinks = links && links.length > 0 ? links : DEFAULT_LINKS;

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/akun-login"); // Atau '/login' sesuai halaman login default anggota
  };

  return (
    <aside className="w-64 bg-[#080d1a]/80 backdrop-blur-md min-h-screen p-5 flex flex-col justify-between shrink-0 hidden md:flex border-0 text-slate-200">
      <div className="flex flex-col gap-6">
        {/* Brand Header: Logo Proporsional & Tipografi Dual-Tone */}
        <div className="flex items-center gap-3.5 px-2 py-1 min-w-0">
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

          <div className="flex flex-col justify-center min-w-0 flex-1">
            <div className="flex items-center gap-1 leading-none">
              <span className="font-extrabold text-base tracking-tight text-white">
                DCC
              </span>
              <span className="font-extrabold text-base tracking-tight text-cyan-400">
                SISTEM
              </span>
            </div>
            {/* whitespace-nowrap & truncate memastikan teks ANGOTA DASHBOARD selalu 1 baris */}
            <span className="text-[10px] font-semibold text-slate-400 tracking-[0.15em] uppercase mt-1 whitespace-nowrap truncate">
              {userRole} DASHBOARD
            </span>
          </div>
        </div>

        {/* Navigasi Links — mendukung icon berupa komponen Lucide ATAU emoji/string biasa */}
        <nav className="flex flex-col gap-1.5">
          {finalLinks.map((item, index) => {
            const IconValue = item.icon;
            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-400 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`
                }
              >
                {typeof IconValue === "string" ? (
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center text-sm leading-none">
                    {IconValue}
                  </span>
                ) : (
                  <IconValue className="w-4 h-4 shrink-0" />
                )}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout Section */}
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
