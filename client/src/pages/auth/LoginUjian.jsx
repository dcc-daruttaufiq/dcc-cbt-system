import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, TABLES } from "../../utils/supabaseClient";
import { normalizeKategori } from "../../utils/examCategories";
import { STORAGE_KEYS } from "../../utils/storageKeys";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { UserCheck, ShieldCheck, Crown } from "lucide-react";

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    // =============================================================
    // 1. LOGIN PENGAWAS & LEAD INSTRUCTOR (MEMBACA TABEL akun_dcc)
    // =============================================================
    if (selectedRole === "master_admin" || selectedRole === "Pengawas") {
      try {
        // Query ke tabel akun_dcc berdasarkan username/email custom DCC
        const { data: akun, error } = await supabase
          .from(AKUN_TABLE)
          .select("*")
          .ilike("username", inputUser)
          .maybeSingle();

        if (error) throw error;

        if (!akun) {
          setErrorMsg(
            "Username/Email custom DCC tidak ditemukan. Periksa kembali penulisan!",
          );
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

        // 🔒 Validasi tipe akun dari database dengan tab peran yang dipilih
        if (selectedRole === "master_admin" && akun.tipe !== "admin") {
          setErrorMsg(
            "Akun ini bukan Lead Instructor (Admin). Silakan pilih tab Pengawas.",
          );
          setIsLoading(false);
          return;
        }

        if (
          selectedRole === "Pengawas" &&
          akun.tipe !== "anggota" &&
          akun.tipe !== "admin"
        ) {
          setErrorMsg(
            "Akun ini bukan Pengawas/Member DCC. Silakan pilih tab yang sesuai.",
          );
          setIsLoading(false);
          return;
        }

        // Format nama lengkap pengguna dari database
        const namaLengkap =
          `${akun.nama_depan || ""} ${akun.nama_belakang || ""}`.trim() ||
          akun.username;

        const roleKey = akun.tipe === "admin" ? "master_admin" : "Pengawas";

        // Simpan sesi Akun DCC
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
        setErrorMsg(
          "Gagal memverifikasi akun ke database. Periksa koneksi internet!",
        );
        setIsLoading(false);
        return;
      }
    }

    // =============================================================
    // 2. LOGIN PESERTA UJIAN (TECHID / NAMA LENGKAP)
    // =============================================================
    if (selectedRole === "peserta") {
      try {
        const { data: listPeserta, error } = await supabase
          .from(TABLES.PESERTA)
          .select("*");

        if (error) throw error;

        if (!Array.isArray(listPeserta) || listPeserta.length === 0) {
          setErrorMsg(
            "Data peserta belum diimpor oleh Pengawas di Supabase Cloud. Silakan hubungi Pengawas Ujian.",
          );
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
          setErrorMsg(
            `Nama Lengkap/TechID "${username}" tidak ditemukan pada data hasil impor Pengawas. Periksa kembali penulisan!`,
          );
          setIsLoading(false);
          return;
        }

        const kategoriValid = normalizeKategori(matchedPeserta.kategori);
        if (!kategoriValid) {
          setErrorMsg(
            `Kategori ujian pada data peserta tidak valid ("${matchedPeserta.kategori || "-"}").`,
          );
          setIsLoading(false);
          return;
        }

        const pesertaTerupdate = {
          ...matchedPeserta,
          kategori: kategoriValid,
          status:
            matchedPeserta.status === "selesai"
              ? "selesai"
              : matchedPeserta.status || "berjalan",
        };

        if (matchedPeserta.status === "belum_mulai") {
          await supabase
            .from(TABLES.PESERTA)
            .update({ status: "berjalan" })
            .eq("tech_id", matchedPeserta.tech_id);
        }

        const displayName =
          pesertaTerupdate.nama ||
          pesertaTerupdate.nama_lengkap ||
          "Peserta Ujian";

        localStorage.setItem(
          STORAGE_KEYS.CURRENT_USER,
          JSON.stringify(pesertaTerupdate),
        );
        localStorage.setItem(STORAGE_KEYS.USER_NAME, displayName);
        localStorage.setItem(
          STORAGE_KEYS.USER_TECH_ID,
          pesertaTerupdate.tech_id,
        );
        localStorage.setItem(
          STORAGE_KEYS.USER_KATEGORI,
          pesertaTerupdate.kategori,
        );
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
        return;
      } catch (err) {
        console.error("Login Supabase Error:", err);
        setErrorMsg(
          "Gagal terhubung ke database Supabase Cloud. Periksa koneksi internet!",
        );
        setIsLoading(false);
        return;
      }
    }
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
    </div>
  );
}
