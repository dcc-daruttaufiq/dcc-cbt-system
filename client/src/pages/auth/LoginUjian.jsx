import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, TABLES } from "../../utils/supabaseClient";
import { normalizeKategori } from "../../utils/examCategories";
import { STORAGE_KEYS } from "../../utils/storageKeys";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { UserCheck, ShieldCheck, Crown, AlertTriangle } from "lucide-react";

const AKUN_TABLE = "akun_dcc";
const AKUN_SESSION_KEY = "dcc_akun_session";

export default function LoginUjian() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("peserta"); // 'peserta' | 'Pengawas' | 'master_admin'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // State Modal Konfirmasi Pindah Sesi Login Ganda
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [pendingPeserta, setPendingPeserta] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    // =============================================================
    // 1. LOGIN PENGAWAS & LEAD INSTRUCTOR
    // =============================================================
    if (selectedRole === "master_admin" || selectedRole === "Pengawas") {
      try {
        const { data: akun, error } = await supabase
          .from(AKUN_TABLE)
          .select("*")
          .ilike("username", inputUser)
          .maybeSingle();

        if (error) throw error;

        if (!akun) {
          setErrorMsg("Username/Email custom DCC tidak ditemukan.");
          setIsLoading(false);
          return;
        }

        if (akun.password !== inputPass) {
          setErrorMsg("Password salah. Silakan coba lagi!");
          setIsLoading(false);
          return;
        }

        if (akun.status !== "aktif") {
          setErrorMsg("Akun DCC ini dinonaktifkan. Hubungi Lead Instructor!");
          setIsLoading(false);
          return;
        }

        if (selectedRole === "master_admin" && akun.tipe !== "admin") {
          setErrorMsg("Akun ini bukan Lead Instructor (Admin).");
          setIsLoading(false);
          return;
        }

        if (
          selectedRole === "Pengawas" &&
          akun.tipe !== "anggota" &&
          akun.tipe !== "admin"
        ) {
          setErrorMsg("Akun ini bukan Pengawas/Member DCC.");
          setIsLoading(false);
          return;
        }

        const namaLengkap =
          `${akun.nama_depan || ""} ${akun.nama_belakang || ""}`.trim() ||
          akun.username;

        const roleKey = akun.tipe === "admin" ? "master_admin" : "Pengawas";

        localStorage.setItem(
          AKUN_SESSION_KEY,
          JSON.stringify({
            id: akun.id,
            nama: namaLengkap,
            username: akun.username,
            tipe: akun.tipe,
          }),
        );

        saveAndRedirect(
          roleKey,
          `token-${roleKey}-${akun.id}`,
          namaLengkap,
          akun.username,
          "all",
        );
        return;
      } catch (err) {
        console.error("Login Akun DCC Error:", err);
        setErrorMsg("Gagal memverifikasi akun ke database.");
        setIsLoading(false);
        return;
      }
    }

    // =============================================================
    // 2. LOGIN PESERTA UJIAN (WITH DIALOG KONFIRMASI LOGIN GANDA)
    // =============================================================
    if (selectedRole === "peserta") {
      try {
        const { data: listPeserta, error } = await supabase
          .from(TABLES.PESERTA || "peserta")
          .select("*");

        if (error) throw error;

        if (!Array.isArray(listPeserta) || listPeserta.length === 0) {
          setErrorMsg("Data peserta belum diimpor oleh Pengawas.");
          setIsLoading(false);
          return;
        }

        const matchedPeserta = listPeserta.find(
          (p) =>
            (p.tech_id && p.tech_id.toLowerCase().trim() === inputUser) ||
            (p.nama && p.nama.toLowerCase().trim() === inputUser) ||
            (p.nama_lengkap &&
              p.nama_lengkap.toLowerCase().trim() === inputUser),
        );

        if (!matchedPeserta) {
          setErrorMsg(`Nama Lengkap/TechID "${username}" tidak ditemukan.`);
          setIsLoading(false);
          return;
        }

        const kategoriValid = normalizeKategori(matchedPeserta.kategori);
        if (!kategoriValid) {
          setErrorMsg(`Kategori ujian pada data peserta tidak valid.`);
          setIsLoading(false);
          return;
        }

        const pesertaWithKat = { ...matchedPeserta, kategori: kategoriValid };

        // 🚨 CEK APAKAH AKUN SEDANG AKTIF DI PERANGKAT LAIN (STATUS AKTIF / BERJALAN)
        if (
          matchedPeserta.session_token &&
          matchedPeserta.status !== "selesai" &&
          matchedPeserta.status !== "belum_mulai"
        ) {
          setIsLoading(false);
          setPendingPeserta(pesertaWithKat);
          setShowSessionModal(true); // Tampilkan Pop-Up Konfirmasi Pemindahan Sesi!
          return;
        }

        // Jika tidak ada sesi aktif lain, langsung masuk
        await eksekusiLoginPeserta(pesertaWithKat);
      } catch (err) {
        console.error("Login Supabase Error:", err);
        setErrorMsg("Gagal terhubung ke database Supabase Cloud.");
        setIsLoading(false);
      }
    }
  };

  // FUNGSI MEMINDAHKAN SESI & MASUK SISTEM
  const eksekusiLoginPeserta = async (pesertaData) => {
    setIsLoading(true);
    const newSessionToken = `SESS_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem("dcc_session_token", newSessionToken);

    try {
      await supabase
        .from(TABLES.PESERTA || "peserta")
        .update({
          session_token: newSessionToken,
          status:
            pesertaData.status === "belum_mulai"
              ? "berjalan"
              : pesertaData.status || "berjalan",
        })
        .eq("tech_id", pesertaData.tech_id);
    } catch (e) {
      console.warn("Gagal update session token:", e);
    }

    const pesertaTerupdate = {
      ...pesertaData,
      session_token: newSessionToken,
      status:
        pesertaData.status === "belum_mulai"
          ? "berjalan"
          : pesertaData.status || "berjalan",
    };

    const displayName =
      pesertaTerupdate.nama || pesertaTerupdate.nama_lengkap || "Peserta Ujian";

    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify(pesertaTerupdate),
    );
    localStorage.setItem(STORAGE_KEYS.USER_NAME, displayName);
    localStorage.setItem(STORAGE_KEYS.USER_TECH_ID, pesertaTerupdate.tech_id);
    localStorage.setItem(STORAGE_KEYS.USER_KATEGORI, pesertaTerupdate.kategori);
    localStorage.setItem(
      STORAGE_KEYS.SELECTED_EXAM_CATEGORY,
      pesertaTerupdate.kategori,
    );

    if (pesertaTerupdate.status !== "selesai") {
      localStorage.removeItem(STORAGE_KEYS.IS_EXAM_FINISHED);
      sessionStorage.removeItem("examSubmitted");
    }

    saveAndRedirect(
      "peserta",
      `token-peserta-${pesertaTerupdate.id || pesertaTerupdate.tech_id}`,
      displayName,
      pesertaTerupdate.tech_id,
      pesertaTerupdate.kategori,
    );
  };

  const saveAndRedirect = (
    role,
    token,
    nama = "",
    techId = "",
    kategori = "word",
  ) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    if (nama) localStorage.setItem(STORAGE_KEYS.USER_NAME, nama);
    if (techId) localStorage.setItem(STORAGE_KEYS.USER_TECH_ID, techId);
    if (kategori) {
      localStorage.setItem(STORAGE_KEYS.USER_KATEGORI, kategori);
      localStorage.setItem(STORAGE_KEYS.SELECTED_EXAM_CATEGORY, kategori);
    }

    if (rememberMe) {
      sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
      sessionStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
      if (nama) sessionStorage.setItem(STORAGE_KEYS.USER_NAME, nama);
    }

    const formattedRole = role.toLowerCase();
    if (formattedRole === "master_admin" || formattedRole === "admin") {
      navigate("/dashboard-admin");
    } else if (formattedRole === "pengawas") {
      navigate("/dashboard-anggota");
    } else {
      navigate("/dashboard-peserta");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-borderCustom bg-surface space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold text-primary tracking-wider">
            SISTEM UJIAN DCC
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Pilih peran Anda untuk masuk ke dalam sistem ujian
          </p>
        </div>

        {/* SELEKSI PERAN */}
        <div className="grid grid-cols-3 gap-1 bg-background p-1.5 rounded-xl border border-borderCustom/60">
          <button
            type="button"
            onClick={() => {
              setSelectedRole("peserta");
              setErrorMsg("");
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-display font-bold transition-all ${
              selectedRole === "peserta"
                ? "bg-primary text-background shadow-md shadow-primary/30 scale-100"
                : "text-slate-400 hover:text-white hover:bg-surface/50"
            }`}
          >
            <UserCheck className="w-4 h-4 mb-1" />
            <span>PESERTA</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole("Pengawas");
              setErrorMsg("");
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-display font-bold transition-all ${
              selectedRole === "Pengawas"
                ? "bg-primary text-background shadow-md shadow-primary/30 scale-100"
                : "text-slate-400 hover:text-white hover:bg-surface/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4 mb-1" />
            <span>PENGAWAS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole("master_admin");
              setErrorMsg("");
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-display font-bold transition-all ${
              selectedRole === "master_admin"
                ? "bg-primary text-background shadow-md shadow-primary/30 scale-100"
                : "text-slate-400 hover:text-white hover:bg-surface/50"
            }`}
          >
            <Crown className="w-4 h-4 mb-1" />
            <span>LEAD INSTRUCTOR</span>
          </button>
        </div>

        {/* PESAN ERROR */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center font-sans">
            {errorMsg}
          </div>
        )}

        {/* FORM LOGIN */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-display font-semibold text-slate-300 mb-1 block uppercase">
              {selectedRole === "peserta"
                ? "Nama Lengkap / TechID"
                : "Username / Email Custom DCC"}
            </label>
            <Input
              type="text"
              placeholder={
                selectedRole === "peserta"
                  ? "Masukkan Nama Lengkap / TechID..."
                  : "nama.belakang@dcc.com"
              }
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-display font-semibold text-slate-300 mb-1 block uppercase">
              {selectedRole === "peserta" ? "TechID" : "Password Akses"}
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs font-sans text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-primary rounded"
              />
              <span>Ingat Akses Saya</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={isLoading}
          >
            {isLoading
              ? "MEMVERIFIKASI..."
              : `MASUK SEBAGAI ${
                  selectedRole === "Pengawas"
                    ? "PENGAWAS"
                    : selectedRole === "master_admin"
                      ? "LEAD INSTRUCTOR"
                      : "PESERTA"
                }`}
          </Button>
        </form>

        <div className="text-center border-t border-borderCustom/40 pt-4">
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Daruttaufiq Computer Centre
          </p>
        </div>
      </Card>

      {/* 🚨 MODAL KONFIRMASI PEMINDAHAN SESI */}
      {showSessionModal && pendingPeserta && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-amber-500/50 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Sesi Ujian Masih Aktif!
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Akun{" "}
                <strong className="text-amber-400">
                  {pendingPeserta.nama || pendingPeserta.tech_id}
                </strong>{" "}
                saat ini terdeteksi sedang aktif di perangkat lain.
              </p>
              <p className="text-[11px] text-slate-400 mt-2 bg-[#030712] p-2.5 rounded-xl border border-slate-800">
                Apakah Anda yakin ingin <strong>memindahkan sesi</strong> ke
                perangkat ini? Perangkat lama akan otomatis dikeluarkan.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                onClick={() => {
                  setShowSessionModal(false);
                  setPendingPeserta(null);
                }}
                className="flex-1 bg-slate-800 text-slate-300 text-xs border-0"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  setShowSessionModal(false);
                  await eksekusiLoginPeserta(pendingPeserta);
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs border-0"
              >
                Ya, Pindahkan Sesi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
