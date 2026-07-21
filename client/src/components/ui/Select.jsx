import React from 'react';
import { cn } from '../../utils/cn';

export default function Select({ className, label, children, ...props }) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && <label className="text-sm font-sans font-medium text-slate-300">{label}</label>}
      <select
        className={cn("w-full px-3 py-2 bg-surface border border-customBorder rounded-lg text-white font-sans focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm cursor-pointer", className)}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
