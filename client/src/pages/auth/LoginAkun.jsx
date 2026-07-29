import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const AKUN_TABLE = 'akun_dcc';
const AKUN_SESSION_KEY = 'dcc_akun_session';

export default function LoginAkun() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const cleanUsername = username.trim().toLowerCase();

    try {
      const { data: akun, error } = await supabase
        .from(AKUN_TABLE)
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (error) throw error;

      if (!akun) {
        setErrorMsg('Username tidak ditemukan. Periksa kembali penulisan.');
        setIsLoading(false);
        return;
      }

      if (akun.password !== password) {
        setErrorMsg('Password salah.');
        setIsLoading(false);
        return;
      }

      if (akun.status !== 'aktif') {
        setErrorMsg('Akun ini sudah dinonaktifkan. Hubungi admin DCC.');
        setIsLoading(false);
        return;
      }

      if (akun.tipe === 'tamu' && akun.tanggal_expired) {
        const hariIni = new Date().toISOString().slice(0, 10);
        if (akun.tanggal_expired < hariIni) {
          setErrorMsg('Akun tamu ini sudah kedaluwarsa. Hubungi admin DCC untuk perpanjangan.');
          setIsLoading(false);
          return;
        }
      }

      localStorage.setItem(AKUN_SESSION_KEY, JSON.stringify({
        id: akun.id,
        nama: `${akun.nama_depan} ${akun.nama_belakang}`,
        username: akun.username,
        tipe: akun.tipe
      }));

      if (akun.tipe === 'admin') {
        navigate('/dashboard-admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Gagal login akun DCC:', err);
      setErrorMsg('Gagal terhubung ke server. Periksa koneksi internet.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-borderCustom bg-surface space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display font-bold text-primary tracking-wider">AKUN DCC</h1>
          <p className="text-xs text-slate-400 font-sans">Login untuk Admin, Anggota, dan Tamu Daruttaufiq Computer Centre</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center font-sans">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-display font-semibold text-slate-300 mb-1 block uppercase">Username</label>
            <Input
              type="text"
              placeholder="nama.belakang@dcc.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-slate-300 mb-1 block uppercase">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? 'MEMVERIFIKASI...' : 'MASUK'}
          </Button>
        </form>

        <div className="text-center border-t border-borderCustom/40 pt-4">
          <p className="text-xs text-slate-400 font-medium tracking-wide">Daruttaufiq Computer Centre</p>
        </div>
      </Card>
    </div>
  );
}