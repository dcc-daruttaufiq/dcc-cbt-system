import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import {
  Users, Plus, X, Search, Trash2, RefreshCw, Save, KeyRound,
  Home, ClipboardList, ScanLine, ShieldCheck, UserCheck, UserPlus2
} from 'lucide-react';

const AKUN_TABLE = 'akun_dcc';
const AKUN_SESSION_KEY = 'dcc_akun_session';

const generatePasswordAcak = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let hasil = '';
  for (let i = 0; i < 8; i++) hasil += chars.charAt(Math.floor(Math.random() * chars.length));
  return hasil;
};

const bersihkanNama = (s) => (s || '').toLowerCase().trim().replace(/[^a-z]/g, '');

export default function KelolaAkun() {
  const navigate = useNavigate();
  const [sesiAdmin, setSesiAdmin] = useState(null);
  const [isCheckingSesi, setIsCheckingSesi] = useState(true);

  const [daftarAkun, setDaftarAkun] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipe, setFilterTipe] = useState('semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [namaDepan, setNamaDepan] = useState('');
  const [namaBelakang, setNamaBelakang] = useState('');
  const [usernamePreview, setUsernamePreview] = useState('');
  const [password, setPassword] = useState('');
  const [tipe, setTipe] = useState('anggota');
  const [tanggalExpired, setTanggalExpired] = useState('');

  const menuAdmin = [
    { label: 'Menu Utama', path: '/', icon: Home },
    { label: 'Sistem Ujian', path: '/dashboard-pengawas', icon: ClipboardList },
    { label: 'Presensi Harian', path: '/absensi-scan', icon: ScanLine },
    { label: 'Kelola Akun DCC', path: '/kelola-akun', icon: Users },
  ];

  // 🔐 Proteksi halaman — cuma admin yang boleh masuk
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AKUN_SESSION_KEY);
      const sesi = raw ? JSON.parse(raw) : null;
      if (!sesi || sesi.tipe !== 'admin') {
        navigate('/akun-login');
        return;
      }
      setSesiAdmin(sesi);
    } catch (e) {
      navigate('/akun-login');
      return;
    } finally {
      setIsCheckingSesi(false);
    }
  }, [navigate]);

  const loadAkun = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(AKUN_TABLE)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDaftarAkun(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat daftar akun:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sesiAdmin) loadAkun();
  }, [sesiAdmin]);

  // Live preview username setiap nama diketik
  useEffect(() => {
    const base = `${bersihkanNama(namaDepan)}.${bersihkanNama(namaBelakang)}`;
    setUsernamePreview(base ? `${base}@dcc.com` : '');
  }, [namaDepan, namaBelakang]);

  const generateUsernameUnik = async (depan, belakang) => {
    const base = `${bersihkanNama(depan)}.${bersihkanNama(belakang)}`;
    let kandidat = `${base}@dcc.com`;
    let counter = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data } = await supabase.from(AKUN_TABLE).select('id').ilike('username', kandidat).maybeSingle();
      if (!data) return kandidat;
      kandidat = `${base}${counter}@dcc.com`;
      counter++;
    }
  };

  const openTambahModal = () => {
    setEditingId(null);
    setNamaDepan('');
    setNamaBelakang('');
    setUsernamePreview('');
    setPassword(generatePasswordAcak());
    setTipe('anggota');
    setTanggalExpired('');
    setIsModalOpen(true);
  };

  const openEditModal = (akun) => {
    setEditingId(akun.id);
    setNamaDepan(akun.nama_depan);
    setNamaBelakang(akun.nama_belakang);
    setUsernamePreview(akun.username);
    setPassword(akun.password);
    setTipe(akun.tipe);
    setTanggalExpired(akun.tanggal_expired || '');
    setIsModalOpen(true);
  };

  const handleSimpan = async (e) => {
    e.preventDefault();
    if (!namaDepan.trim() || !namaBelakang.trim()) return alert('Nama depan & belakang wajib diisi!');
    if (!password.trim()) return alert('Password wajib diisi!');
    if (tipe === 'tamu' && !tanggalExpired) return alert('Tanggal expired wajib diisi untuk akun Tamu!');

    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from(AKUN_TABLE)
          .update({
            nama_depan: namaDepan.trim(),
            nama_belakang: namaBelakang.trim(),
            password,
            tipe,
            tanggal_expired: tipe === 'tamu' ? tanggalExpired : null
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const usernameFinal = await generateUsernameUnik(namaDepan, namaBelakang);
        const { error } = await supabase.from(AKUN_TABLE).insert({
          nama_depan: namaDepan.trim(),
          nama_belakang: namaBelakang.trim(),
          username: usernameFinal,
          password,
          tipe,
          status: 'aktif',
          tanggal_expired: tipe === 'tamu' ? tanggalExpired : null
        });
        if (error) throw error;
        alert(`Akun berhasil dibuat!\n\nUsername: ${usernameFinal}\nPassword: ${password}`);
      }

      setIsModalOpen(false);
      await loadAkun();
    } catch (err) {
      console.error('Gagal menyimpan akun:', err);
      alert('Gagal menyimpan akun ke Supabase Cloud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatusAkun = async (akun) => {
    const statusBaru = akun.status === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      const { error } = await supabase.from(AKUN_TABLE).update({ status: statusBaru }).eq('id', akun.id);
      if (error) throw error;
      setDaftarAkun((prev) => prev.map((a) => (a.id === akun.id ? { ...a, status: statusBaru } : a)));
    } catch (err) {
      alert('Gagal mengubah status akun.');
    }
  };

  const handleHapus = async (id, nama) => {
    if (!confirm(`Hapus akun "${nama}"? Tindakan ini permanen.`)) return;
    try {
      const { error } = await supabase.from(AKUN_TABLE).delete().eq('id', id);
      if (error) throw error;
      setDaftarAkun((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert('Gagal menghapus akun.');
    }
  };

  const isTamuExpired = (akun) => {
    if (akun.tipe !== 'tamu' || !akun.tanggal_expired) return false;
    const hariIni = new Date().toISOString().slice(0, 10);
    return akun.tanggal_expired < hariIni;
  };

  const daftarTerfilter = daftarAkun.filter((a) => {
    if (filterTipe !== 'semua' && a.tipe !== filterTipe) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        `${a.nama_depan} ${a.nama_belakang}`.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getTipeBadge = (t) => {
    if (t === 'admin') return { text: 'Admin', className: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
    if (t === 'tamu') return { text: 'Tamu', className: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    return { text: 'Anggota', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' };
  };

  if (isCheckingSesi) {
    return <div className="min-h-screen bg-[#030712] flex items-center justify-center text-slate-400 text-xs font-['Poppins',sans-serif]">Memeriksa sesi...</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 font-['Poppins',sans-serif]">
      <Sidebar links={menuAdmin} userRole="Admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <Users className="text-cyan-400 w-6 h-6" />
              <div>
                <h1 className="text-base font-['Rajdhani',sans-serif] font-bold text-white tracking-wider uppercase">KELOLA AKUN DCC</h1>
                <p className="text-xs text-slate-400 font-['Poppins',sans-serif]">Admin, Anggota, dan Tamu — login web DCC</p>
              </div>
            </div>
            <Button onClick={openTambahModal} className="text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-['Rajdhani',sans-serif] font-bold border-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all shadow-lg shadow-cyan-400/20">
              <Plus className="w-4 h-4 text-slate-950" /> Tambah Akun
            </Button>
          </div>
        </Navbar>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-5">

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau username..."
                  className="w-full bg-[#0d1527]/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-['Poppins',sans-serif]"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex gap-1.5 bg-[#0d1527]/80 p-1.5 rounded-xl border border-slate-800 text-xs font-['Rajdhani',sans-serif] font-bold">
                {[
                  { key: 'semua', label: 'Semua' },
                  { key: 'admin', label: 'Admin' },
                  { key: 'anggota', label: 'Anggota' },
                  { key: 'tamu', label: 'Tamu' }
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterTipe(f.key)}
                    className={`px-3 py-1.5 rounded-lg transition-all tracking-wider uppercase ${filterTipe === f.key ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="p-10 text-center text-xs text-slate-500 font-['Poppins',sans-serif]">Memuat daftar akun...</div>
              ) : daftarTerfilter.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 bg-[#0d1527]/40 rounded-2xl border border-slate-800/60 font-['Poppins',sans-serif]">Belum ada akun pada filter ini.</div>
              ) : (
                daftarTerfilter.map((akun) => {
                  const badge = getTipeBadge(akun.tipe);
                  const expired = isTamuExpired(akun);
                  return (
                    <div key={akun.id} className="p-4 bg-[#0d1527]/60 backdrop-blur-md border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 font-['Rajdhani',sans-serif] font-bold text-sm shrink-0">
                          {akun.nama_depan.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-['Rajdhani',sans-serif] font-bold text-white truncate tracking-wide">{akun.nama_depan} {akun.nama_belakang}</p>
                          <p className="text-[11px] font-['Rajdhani',sans-serif] text-slate-400 truncate tracking-wider">{akun.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[9px] px-2 py-0.5 rounded-md font-['Rajdhani',sans-serif] font-bold border uppercase tracking-wider ${badge.className}`}>{badge.text}</Badge>

                        {akun.tipe === 'tamu' && akun.tanggal_expired && (
                          <span className={`text-[10px] font-['Rajdhani',sans-serif] font-bold px-2 py-0.5 rounded-md border tracking-wider ${expired ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' : 'text-slate-400 border-slate-700 bg-slate-800/40'}`}>
                            {expired ? 'Expired' : 'Exp'} {akun.tanggal_expired}
                          </span>
                        )}

                        <button
                          onClick={() => toggleStatusAkun(akun)}
                          className={`text-[10px] font-['Rajdhani',sans-serif] font-bold px-2.5 py-1 rounded-md border transition uppercase tracking-wider ${
                            akun.status === 'aktif'
                              ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20'
                              : 'text-slate-500 border-slate-700 bg-slate-800/40 hover:bg-slate-800'
                          }`}
                        >
                          {akun.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                        </button>

                        <button onClick={() => openEditModal(akun)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition" title="Edit">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleHapus(akun.id, `${akun.nama_depan} ${akun.nama_belakang}`)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition" title="Hapus">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL TAMBAH/EDIT AKUN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="font-['Rajdhani',sans-serif] text-base font-bold text-cyan-400 uppercase tracking-wider">{editingId ? 'Edit Akun' : 'Tambah Akun Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSimpan} className="space-y-4 font-['Poppins',sans-serif]">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nama Depan" value={namaDepan} onChange={(e) => setNamaDepan(e.target.value)} required />
                <Input label="Nama Belakang" value={namaBelakang} onChange={(e) => setNamaBelakang(e.target.value)} required />
              </div>

              <div>
                <label className="text-xs font-['Rajdhani',sans-serif] font-bold text-slate-300 mb-1.5 block uppercase tracking-wider">Username {editingId ? '(tidak berubah)' : '(preview)'}</label>
                <div className="bg-[#030712]/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-['Rajdhani',sans-serif] font-bold text-cyan-400 tracking-wider">
                  {usernamePreview || '—'}
                </div>
              </div>

              <div>
                <label className="text-xs font-['Rajdhani',sans-serif] font-bold text-slate-300 mb-1.5 block uppercase tracking-wider">Tipe Akun</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'admin', label: 'Admin', icon: ShieldCheck },
                    { key: 'anggota', label: 'Anggota', icon: UserCheck },
                    { key: 'tamu', label: 'Tamu', icon: UserPlus2 }
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTipe(t.key)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-['Rajdhani',sans-serif] font-bold transition tracking-wider uppercase ${
                        tipe === t.key ? 'bg-cyan-400 text-slate-950 border-cyan-400' : 'text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {tipe === 'tamu' && (
                <div>
                  <label className="text-xs font-['Rajdhani',sans-serif] font-bold text-amber-400 mb-1.5 block uppercase tracking-wider">Tanggal Expired</label>
                  <input
                    type="date"
                    value={tanggalExpired}
                    onChange={(e) => setTanggalExpired(e.target.value)}
                    className="w-full bg-[#030712]/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-['Poppins',sans-serif]"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-['Rajdhani',sans-serif] font-bold text-slate-300 mb-1.5 flex items-center justify-between uppercase tracking-wider">
                  <span>Password</span>
                  <button type="button" onClick={() => setPassword(generatePasswordAcak())} className="text-cyan-400 text-[10px] flex items-center gap-1 normal-case font-['Poppins',sans-serif] hover:underline">
                    <RefreshCw className="w-3 h-3" /> Buat Acak
                  </button>
                </label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-800 text-xs border-0 text-slate-300 font-['Poppins',sans-serif]">Batal</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-cyan-400 text-slate-950 font-['Rajdhani',sans-serif] font-bold text-xs border-0 flex items-center gap-1.5 shadow-lg shadow-cyan-400/20">
                  <Save className="w-4 h-4" /> {isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}