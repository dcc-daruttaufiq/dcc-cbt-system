import React from 'react';
import { cn } from '../../utils/cn';

export default function Button({ className, variant = 'primary', size = 'md', children, ...props }) {
  const baseStyles = 'inline-flex items-center justify-center font-sans font-medium rounded-lg transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none select-none';
  
  // SEMUA SHADOW & GLOWING SHADOW-PRIMARY DIHAPUS TOTAL
  const variants = {
    primary: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold border-0',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    outline: 'border border-slate-700 text-slate-300 hover:bg-slate-800/80 bg-transparent',
    ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white'
  };

  const sizes = { 
    sm: 'px-3 py-1.5 text-xs', 
    md: 'px-4 py-2 text-sm', 
    lg: 'px-6 py-3 text-base' 
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}