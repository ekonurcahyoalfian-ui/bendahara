export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getNamaBulan(bulan: number): string {
  const bulanNames = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];
  return bulanNames[bulan - 1] || '-';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function parseRupiah(str: string): number {
  return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
}

export function getBulanList() {
  return [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printElement(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #f0f0f0; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      h2, h3 { margin: 4px 0; }
      .header { text-align: center; margin-bottom: 16px; }
      .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #666; }
      .kop-surat { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
      @media print { .no-print { display: none; } }
    </style>
    </head><body>${el.innerHTML}
    <div class="footer">Copyright &copy; 2026 RUMAHIMI &mdash; Sistem Administrasi Keuangan Digital</div>
    </body></html>
  `);
  w.document.close();
  w.print();
}
