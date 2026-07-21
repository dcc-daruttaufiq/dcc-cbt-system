import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-darkBg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-customBorder rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in duration-200">
        <div className="px-5 py-4 border-b border-customBorder flex items-center justify-between">
          <h3 className="font-display text-xl text-white font-bold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 text-slate-300 font-sans text-sm">{children}</div>
      </div>
    </div>
  );
}
