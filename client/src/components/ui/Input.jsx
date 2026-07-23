import React from 'react';
import { cn } from '../../utils/cn';

export default function Input({ className, label, error, ...props }) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && <label className="text-sm font-sans font-medium text-slate-300">{label}</label>}
      <input
        className={cn(
          "w-full px-3 py-2 bg-[#030712] border border-slate-800 rounded-lg text-white font-sans placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-all text-sm",
          error && "border-rose-500 focus:border-rose-500",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-rose-400 font-sans">{error}</span>}
    </div>
  );
}