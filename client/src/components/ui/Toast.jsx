import React from 'react';
import { X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-surface border border-customBorder px-4 py-3 rounded-xl shadow-2xl max-w-sm">
      <div className={`w-2 h-2 rounded-full ${type === 'success' ? 'bg-emerald-400' : 'bg-primary'}`} />
      <p className="text-sm font-sans text-white pr-4">{message}</p>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-white ml-auto">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
