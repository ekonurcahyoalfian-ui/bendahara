import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, AlertCircle, CheckCircle, DollarSign, Calendar, BookOpen } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { formatRupiah, getNamaBulan } from '../lib/utils';
import type { User } from '../types';

interface Props { currentUser: User; onNavigate: (p: string) => void; }

export default function Dashboard({ currentUser, onNavigate }: Props) {
  const { siswa: siswaList, tagihan: tagihanList, pembayaran: allPembayaran, pengeluaran: pengeluaranList, pemasukanLain: pemasukanLainList, jenisTagihan: jenisTagihanList, settings } = useApp();
  const now = new Date();
  const bulanIni = now.getMonth() + 1;
  const tahunIni = now.getFullYear();

  const isWali = currentUser.role === 'wali';

  const data = useMemo(() => {
    const pembayaranList = allPembayaran.filter(p => !p.dibatalkan);

    // ── Filter khusus wali: hanya data siswa miliknya ──
    const mySiswaId = currentUser.studentId;
    const myTagihan = isWali && mySiswaId
      ? tagihanList.filter(t => t.siswaId === mySiswaId)
      : tagihanList;
    const myPembayaran = isWali && mySiswaId
      ? pembayaranList.filter(p => p.siswaId === mySiswaId)
      : pembayaranList;

    const totalSiswaAktif = siswaList.filter(s => s.status === 'aktif').length;

    // Total tagihan bulan ini
    const tagihanBulanIni = myTagihan.filter(t => t.bulan === bulanIni && t.tahun === tahunIni);
    const totalTagihanBulanIni = tagihanBulanIni.reduce((s, t) => s + (t.nominal - t.diskon), 0);

    // Total pembayaran bulan ini
    const pembayaranBulanIni = myPembayaran.filter(p => {
      const d = new Date(p.tanggal);
      return d.getMonth() + 1 === bulanIni && d.getFullYear() === tahunIni;
    });
    const totalPembayaranBulanIni = pembayaranBulanIni.reduce((s, p) => s + p.jumlah, 0);

    // Total pengeluaran bulan ini
    const pengeluaranBulanIni = pengeluaranList.filter(p => {
      const d = new Date(p.tanggal);
      return d.getMonth() + 1 === bulanIni && d.getFullYear() === tahunIni;
    });
    const totalPengeluaranBulanIni = pengeluaranBulanIni.reduce((s, p) => s + p.jumlah, 0);

    // Pemasukan lain bulan ini
    const pemasukanBulanIni = pemasukanLainList.filter(p => {
      const d = new Date(p.tanggal);
      return d.getMonth() + 1 === bulanIni && d.getFullYear() === tahunIni;
    });
    const totalPemasukanBulanIni = pemasukanBulanIni.reduce((s, p) => s + p.jumlah, 0);

    // Tunggakan: tagihan belum lunas
    let totalTunggakan = 0;
    const siswaTunggakanSet = new Set<string>();

    myTagihan.forEach(t => {
      const dibayar = pembayaranList
        .filter(p => p.tagihanId === t.id)
        .reduce((s, p) => s + p.jumlah, 0);
      const sisa = (t.nominal - t.diskon) - dibayar;
      if (sisa > 0) {
        totalTunggakan += sisa;
        siswaTunggakanSet.add(t.siswaId);
      }
    });
    const siswaTunggakan = siswaTunggakanSet.size;

    // Recent payments
    const recentPayments = [...myPembayaran]
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
      .slice(0, 5)
      .map(p => {
        const siswa = siswaList.find(s => s.id === p.siswaId);
        const tagihan = tagihanList.find(t => t.id === p.tagihanId);
        const jenis = jenisTagihanList.find(j => j.id === tagihan?.jenisTagihanId);
        return { ...p, siswaNama: siswa?.nama || '-', jenisNama: jenis?.nama || '-' };
      });

    return {
      totalSiswaAktif, totalTagihanBulanIni, totalPembayaranBulanIni,
      totalPengeluaranBulanIni, totalPemasukanBulanIni, totalTunggakan,
      siswaTunggakan, recentPayments,
      saldo: totalPembayaranBulanIni + totalPemasukanBulanIni - totalPengeluaranBulanIni,
    };
  }, [allPembayaran, siswaList, tagihanList, pengeluaranList, pemasukanLainList, jenisTagihanList, currentUser, isWali, bulanIni, tahunIni]);

  const cards = isWali ? [
    { label: 'Total Tagihan', value: formatRupiah(data.totalTagihanBulanIni), icon: <BookOpen size={20} />, color: 'bg-blue-500', sub: getNamaBulan(bulanIni) },
    { label: 'Sudah Dibayar', value: formatRupiah(data.totalPembayaranBulanIni), icon: <CheckCircle size={20} />, color: 'bg-green-500', sub: 'Bulan ini' },
    { label: 'Tunggakan', value: formatRupiah(data.totalTunggakan), icon: <AlertCircle size={20} />, color: 'bg-red-500', sub: 'Total belum lunas' },
  ] : [
    { label: 'Siswa Aktif', value: data.totalSiswaAktif.toString(), icon: <Users size={20} />, color: 'bg-blue-500', sub: 'Total siswa' },
    { label: 'Pemasukan Bulan Ini', value: formatRupiah(data.totalPembayaranBulanIni + data.totalPemasukanBulanIni), icon: <TrendingUp size={20} />, color: 'bg-green-500', sub: getNamaBulan(bulanIni) },
    { label: 'Pengeluaran Bulan Ini', value: formatRupiah(data.totalPengeluaranBulanIni), icon: <TrendingDown size={20} />, color: 'bg-orange-500', sub: getNamaBulan(bulanIni) },
    { label: 'Saldo Bersih', value: formatRupiah(data.saldo), icon: <DollarSign size={20} />, color: 'bg-purple-500', sub: 'Bulan ini' },
    { label: 'Total Tunggakan', value: formatRupiah(data.totalTunggakan), icon: <AlertCircle size={20} />, color: 'bg-red-500', sub: `${data.siswaTunggakan} siswa` },
    { label: 'Tagihan Bulan Ini', value: formatRupiah(data.totalTagihanBulanIni), icon: <Calendar size={20} />, color: 'bg-indigo-500', sub: getNamaBulan(bulanIni) },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Selamat Datang, {currentUser.name}!</h2>
        <p className="text-sm text-gray-500">{settings.namaSekolah} — Tahun Ajaran {settings.tahunAjaran}</p>
      </div>

      <div className={`grid gap-4 ${isWali ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white`}>
                {card.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">{card.value}</div>
            <div className="text-sm font-medium text-gray-600">{card.label}</div>
            <div className="text-xs text-gray-400">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {!isWali && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Pembayaran Terbaru</h3>
            <button onClick={() => onNavigate('pembayaran')} className="text-xs text-blue-600 hover:underline">Lihat semua</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Siswa</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Jenis</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Jumlah</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tanggal</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Metode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentPayments.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada pembayaran</td></tr>
                ) : (
                  data.recentPayments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{p.siswaNama}</td>
                      <td className="px-4 py-2 text-gray-600">{p.jenisNama}</td>
                      <td className="px-4 py-2 text-green-600 font-semibold">{formatRupiah(p.jumlah)}</td>
                      <td className="px-4 py-2 text-gray-500">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.metodeBayar === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {p.metodeBayar === 'cash' ? 'Cash' : 'Transfer'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isWali && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Data Siswa', page: 'siswa', icon: <Users size={20} />, color: 'bg-blue-50 text-blue-600 border-blue-200' },
            { label: 'Tagihan', page: 'tagihan', icon: <BookOpen size={20} />, color: 'bg-orange-50 text-orange-600 border-orange-200' },
            { label: 'Pembayaran', page: 'pembayaran', icon: <CheckCircle size={20} />, color: 'bg-green-50 text-green-600 border-green-200' },
            { label: 'Laporan', page: 'laporan', icon: <TrendingUp size={20} />, color: 'bg-purple-50 text-purple-600 border-purple-200' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => onNavigate(item.page)}
              className={`border rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow ${item.color}`}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
