/** Export CSV lisible par Excel (séparateur « ; », accents conservés). */
export function exporterCsv(nom: string, entetes: string[], lignes: (string | number)[][]): void {
  const cellule = (v: string | number) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const contenu = [entetes, ...lignes].map(l => l.map(cellule).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nom}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
