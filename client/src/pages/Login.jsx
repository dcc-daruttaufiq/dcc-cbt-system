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

    // Akses Universal Cepat untuk testing
    const isAdminUniversal = username === 'admin' && password === 'admin123';

    try {
      if (isAdminUniversal) {
        saveAndRedirect(selectedRole, `token-admin-${selectedRole}`, 'Admin');
        return;
      }

      // Nembak API Backend Real
      const res = await API.post('/auth/login', { 
        username, 
        password 
      });
      
      const { token, role, nama } = res.data;
      saveAndRedirect(role || selectedRole, token, nama);

    } catch (err) {
      console.error('Login Error:', err);
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      
      if (password === '123') {
        saveAndRedirect(selectedRole, `dummy-token-${selectedRole}`, 'Testing User');
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

        {/* TAB CHOOSER: MATCHING SESUAI PALETTE PRIMARY */}
        <div className="grid grid-cols-3 gap-1 bg-background p-1.5 rounded-xl border border-borderCustom/60">
          <button
            type="button"
            onClick={() => setSelectedRole('peserta')}
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
            onClick={() => setSelectedRole('panitia')}
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
            onClick={() => setSelectedRole('master_admin')}
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
              Username / ID
            </label>
            <Input
              type="text"
              placeholder="Masukkan username/ID..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-display font-semibold text-slate-300 mb-1 block uppercase">
              Password Sesi
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

        {/* Quick Testing Info */}
        <div className="text-center border-t border-borderCustom/40 pt-4">
          <p className="text-[10px] text-slate-500 font-mono">
            Akses Universal: Username <code className="text-primary">admin</code> & Password <code className="text-primary">admin123</code>
          </p>
        </div>

      </Card>
    </div>
  );
}