import React from 'react';
import { cn } from '../../utils/cn';

export default function Button({ className, variant = 'primary', size = 'md', children, ...props }) {
  const baseStyles = 'inline-flex items-center justify-center font-sans font-semibold rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]';
  
  // Kombinasi Warna Tajam, Bersih & High Contrast (Tanpa Shadow Biru/Neon)
  const variants = {
    primary: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold border-0',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/40 font-semibold',
    success: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border-0',
    outline: 'border border-slate-700 text-slate-200 hover:bg-slate-800/80 bg-transparent',
    ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white'
  };

  const sizes = { 
    sm: 'px-3 py-1.5 text-xs gap-1.5', 
    md: 'px-4 py-2 text-xs gap-2', 
    lg: 'px-5 py-2.5 text-sm gap-2' 
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}