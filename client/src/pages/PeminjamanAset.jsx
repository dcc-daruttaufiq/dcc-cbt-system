import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PackageCheck, Plus, Clock, CheckCircle2, XCircle, RotateCcw
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase } from '../utils/supabaseClient';

const statusStyle = {
  Menunggu: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Disetujui: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  Dikembalikan: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Ditolak: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const statusIcon = {
  Menunggu: Clock,
  Disetujui: CheckCircle2,
  Dikembalikan: RotateCcw,
  Ditolak: XCircle,
};

export default function PeminjamanAset() {
  useDocumentTitle('Peminjaman Aset Lab');
  const [asetTersedia, setAsetTersedia] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [form, setForm] = useState({ asetId: '', peminjam: '', keperluan: '' });
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAset = async () => {
    const { data, error } = await supabase
      .from('aset_lab')
      .select('*')
      .eq('tersedia', true)
      .order('nama', { ascending: true });
    if (!error) setAsetTersedia(data || []);
    return error;
  };

  const fetchRiwayat = async () => {
    const { data, error } = await supabase
      .from('peminjaman_aset')
      .select('*, aset_lab(nama)')
      .order('tanggal_pinjam', { ascending: false })
      .limit(50);
    if (!error) setRiwayat(data || []);
    return error;
  };

  const fetchAll = async () => {
    setLoading(true);
    setErrMsg(null);
    const e1 = await fetchAset();
    const e2 = await fetchRiwayat();
    if (e1 || e2) setErrMsg((e1 || e2).message);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asetId || !form.peminjam || !form.keperluan) return;
    setSubmitting(true);
    const { error } = await supabase.from('peminjaman_aset').insert({
      aset_id: form.asetId,
      peminjam_nama: form.peminjam,
      keperluan: form.keperluan,
    });
    setSubmitting(false);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    setForm({ asetId: '', peminjam: '', keperluan: '' });
    fetchRiwayat();
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-['Poppins',sans-serif] pb-20 px-6 pt-10">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/30">
            <PackageCheck className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-['Rajdhani',sans-serif] text-2xl font-bold text-white uppercase tracking-wide">
              Peminjaman Aset Lab
            </h1>
            <p className="text-xs text-slate-400">Ajukan dan pantau peminjaman perangkat lab DCC secara tercatat.</p>
          </div>
        </div>

        {errMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg px-4 py-3">
            Terjadi kendala: {errMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORM PENGAJUAN */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1 bg-[#0d1527]/70 border border-slate-800 rounded-2xl p-6 h-fit"
          >
            <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-cyan-400" /> Ajukan Peminjaman
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 uppercase font-['Rajdhani',sans-serif] tracking-wider">Pilih Aset</label>
                <select
                  value={form.asetId}
                  onChange={(e) => setForm({ ...form, asetId: e.target.value })}
                  className="w-full mt-1 bg-[#0a1120] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/60"
                >
                  <option value="">
                    {asetTersedia.length === 0 ? '— Belum ada data aset —' : '— Pilih perangkat —'}
                  </option>
                  {asetTersedia.map((a) => (
                    <option key={a.id} value={a.id}>{a.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase font-['Rajdhani',sans-serif] tracking-wider">Nama Peminjam</label>
                <input
                  type="text"
                  value={form.peminjam}
                  onChange={(e) => setForm({ ...form, peminjam: e.target.value })}
                  placeholder="Nama & TechID / Jabatan"
                  className="w-full mt-1 bg-[#0a1120] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase font-['Rajdhani',sans-serif] tracking-wider">Keperluan</label>
                <textarea
                  value={form.keperluan}
                  onChange={(e) => setForm({ ...form, keperluan: e.target.value })}
                  placeholder="Jelaskan keperluan peminjaman"
                  rows={3}
                  className="w-full mt-1 bg-[#0a1120] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/60 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 rounded-xl bg-cyan-400/10 border border-cyan-400/30 px-4 py-2.5 font-['Rajdhani',sans-serif] text-xs font-bold text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 transition-all uppercase tracking-wider disabled:opacity-50"
              >
                {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            </div>
          </motion.form>

          {/* RIWAYAT PEMINJAMAN */}
          <div className="lg:col-span-2">
            <h2 className="font-['Rajdhani',sans-serif] font-bold text-white uppercase tracking-wide text-sm mb-4">
              Riwayat & Status Peminjaman
            </h2>
            {loading ? (
              <p className="text-xs text-slate-500">Memuat...</p>
            ) : riwayat.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada data peminjaman. Isi data aset di tabel `aset_lab` dulu, lalu coba ajukan lewat form di samping.</p>
            ) : (
              <div className="space-y-3">
                {riwayat.map((row) => {
                  const SIcon = statusIcon[row.status] || Clock;
                  return (
                    <div key={row.id} className="bg-[#0d1527]/70 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-['Rajdhani',sans-serif] font-bold text-white text-sm">{row.aset_lab?.nama || 'Aset tidak diketahui'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{row.peminjam_nama}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{row.keperluan}</p>
                        <p className="text-[10px] text-slate-600 mt-2 font-['Rajdhani',sans-serif] uppercase tracking-wider">
                          {row.tanggal_pinjam ? new Date(row.tanggal_pinjam).toLocaleString('id-ID') : '—'}
                        </p>
                      </div>
                      <span className={`flex items-center gap-1 shrink-0 text-[10px] font-['Rajdhani',sans-serif] font-bold px-2.5 py-1 rounded-md border uppercase ${statusStyle[row.status] || statusStyle.Menunggu}`}>
                        <SIcon className="h-3 w-3" /> {row.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}