import React from 'react';

export default function Table({ headers = [], data = [], renderRow }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-customBorder bg-surface/40">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-customBorder bg-surface">
            {headers.map((h, i) => <th key={i} className="px-4 py-3 font-display text-sm font-bold text-slate-300 tracking-wider">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-customBorder/40 font-sans text-sm text-white">
          {data.map((item, index) => renderRow(item, index))}
        </tbody>
      </table>
    </div>
  );
}
