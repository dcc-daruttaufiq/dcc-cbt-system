import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { UserCheck, ShieldCheck, Crown } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  
  const [selectedRole, setSelectedRole] = useState('peserta'); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const inputUser = username.trim();
    const inputPass = password.trim();

    // 1. CEK AKSES KREDENSIAL PANITIA & MASTER ADMIN (REAL / LOCAL BYPASS)
    if (selectedRole === 'master_admin') {
      if ((inputUser === 'admin' && (inputPass === 'admin123' || inputPass === '123')) || inputPass === 'admin123') {
        saveAndRedirect('master_admin', 'token-master-admin-real', 'Master Admin');
        return;
      }
    } else if (selectedRole === 'panitia') {
      if ((inputUser === 'panitia' || inputUser === 'admin') && (inputPass === 'panitia123' || inputPass === 'admin123' || inputPass === '123')) {
        saveAndRedirect('panitia', 'token-panitia-real', 'Panitia Ujian');
        return;
      }
    }

    // 2. JIKA LOGIN SEBAGAI PESERTA: INTEGRASI REAL DENGAN DATA IMPORT EXCEL
    if (selectedRole === 'peserta') {
      const savedPesertaStr = localStorage.getItem('dcc_sesi_peserta');
      let listPeserta = savedPesertaStr ? JSON.parse(savedPesertaStr) : [];

      // Cari peserta berdasarkan TechID atau Nama Lengkap
      let matchedPeserta = listPeserta.find(
        p => p.tech_id?.toLowerCase() === inputUser.toLowerCase() ||
             p.nama?.toLowerCase() === inputUser.toLowerCase()
      );

      if (!matchedPeserta) {
        // Jika belum ada di list impor, daftarkan otomatis sebagai peserta real baru
        matchedPeserta = {
          user_id: Date.now(),
          nama: inputUser,
          nama_lengkap: inputUser,
          tech_id: inputUser.toUpperCase(),
          kategori: 'msoffice',
          status: 'berjalan', // Mengubah status menjadi Sedang Ujian secara realtime
          status_koreksi: 'belum_dikoreksi',
          nilai_pg: 0,
          nilai_praktik: 0,
          nilai_akhir: 0
        };
        listPeserta.push(matchedPeserta);
      } else {
        // Update status pengerjaan peserta menjadi 'berjalan' (Sedang Ujian)
        listPeserta = listPeserta.map(p => {
          if (p.tech_id === matchedPeserta.tech_id || String(p.user_id) === String(matchedPeserta.user_id)) {
            return { ...p, status: 'berjalan' };
          }
          return p;
        });
      }

      // Simpan perubahan ke storage untuk dibaca Dashboard Panitia
      localStorage.setItem('dcc_sesi_peserta', JSON.stringify(listPeserta));
      localStorage.setItem('currentUser', JSON.stringify(matchedPeserta));
      localStorage.removeItem('isExamFinished');

      saveAndRedirect('peserta', `token-peserta-${matchedPeserta.user_id}`, matchedPeserta.nama);
      return;
    }

    // 3. TRY API BACKEND JIKA TERHUBUNG SERVER
    try {
      const res = await API.post('/auth/login', { 
        username: inputUser, 
        password: inputPass 
      });
      
      const { token, role, nama } = res.data;
      saveAndRedirect(role || selectedRole, token, nama);

    } catch (err) {
      console.error('Login Error:', err);
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      
      if (inputPass === '123' || inputPass === 'admin123') {
        saveAndRedirect(selectedRole, `token-bypass-${selectedRole}`, inputUser || 'Official User');
      } else {
        setErrorMsg(backendMessage || `Gagal login sebagai ${selectedRole.toUpperCase()}. Periksa kredensial Anda!`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveAndRedirect = (role, token, nama = '') => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', token);
    storage.setItem('userRole', role);
    if (nama) storage.setItem('userName', nama);

    const formattedRole = role.toLowerCase();
    if (formattedRole === 'master_admin' || formattedRole === 'admin') {
      navigate('/dashboard-admin');
    } else if (formattedRole === 'panitia') {
      navigate('/dashboard-panitia');
    } else {
      navigate('/dashboard-peserta');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-borderCustom bg-surface space-y-6">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold text-primary tracking-wider">PORTAL DCC-CBT</h1>
          <p className="text-xs text-slate-400 font-sans">Pilih peran Anda untuk masuk ke dalam sistem</p>
        </div>

        {/* TAB CHOOSER ROLE LOGIN */}
        <div className="grid grid-cols-3 gap-1 bg-background p-1.5 rounded-xl border border-borderCustom/60">
          <button
            type="button"
            onClick={() => { setSelectedRole('peserta'); setErrorMsg(''); }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-display font-bold transition-all ${
              selectedRole === 'peserta'
                ? 'bg-primary text-background shadow-md shadow-primary/30 scale-100'
                : 'text-slate-400 hover:text-white hover:bg-surface/50'
            }`}
          >
            <UserCheck className="w-4 h-4 mb-1" />
            <span>PESERTA</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('panitia'); setErrorMsg(''); }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-display font-bold transition-all ${
              selectedRole === 'panitia'
                ? 'bg-primary text-background shadow-md shadow-primary/30 scale-100'
                : 'text-slate-400 hover:text-white hover:bg-surface/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 mb-1" />
            <span>PANITIA</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('master_admin'); setErrorMsg(''); }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-display font-bold transition-all ${
              selectedRole === 'master_admin'
                ? 'bg-primary text-background shadow-md shadow-primary/30 scale-100'
                : 'text-slate-400 hover:text-white hover:bg-surface/50'
            }`}
          >
            <Crown className="w-4 h-4 mb-1" />
            <span>MASTER</span>
          </button>
        </div>

        {/* Alert Error */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center font-sans">
            {errorMsg}
          </div>
        )}

        {/* Form Input Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-display font-semibold text-slate-300 mb-1 block uppercase">
              {selectedRole === 'peserta' ? 'TechID / Nama Peserta' : 'Username Admin / Panitia'}
            </label>
            <Input
              type="text"
              placeholder={selectedRole === 'peserta' ? 'Masukkan TechID (contoh: DCC25-001)...' : 'Masukkan username...'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-display font-semibold text-slate-300 mb-1 block uppercase">
              {selectedRole === 'peserta' ? 'Password / PIN Ujian' : 'Password Akses'}
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

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? 'MEMVERIFIKASI...' : `MASUK SEBAGAI ${selectedRole.toUpperCase()}`}
          </Button>
        </form>

        {/* Info Kredensial Resmi */}
        <div className="text-center border-t border-borderCustom/40 pt-4 space-y-1">
          {selectedRole === 'peserta' ? (
            <p className="text-[11px] text-slate-400">
              Siswa menggunakan <strong className="text-primary">TechID</strong> hasil impor Panitia dari file Excel.
            </p>
          ) : (
            <p className="text-[10px] text-slate-500 font-mono">
              Username Panitia: <code className="text-primary">panitia</code> | Master: <code className="text-primary">admin</code> (Pass: <code className="text-primary">123</code> / <code className="text-primary">admin123</code>)
            </p>
          )}
        </div>

      </Card>
    </div>
  );
}