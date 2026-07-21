import React from 'react';
import { cn } from '../../utils/cn';

export default function Radio({ className, label, id, ...props }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <input
        type="radio"
        id={id}
        className={cn("w-4 h-4 bg-surface border-customBorder text-primary focus:ring-primary/50 accent-primary cursor-pointer", className)}
        {...props}
      />
      {label && <label htmlFor={id} className="text-sm font-sans text-slate-300 cursor-pointer">{label}</label>}
    </div>
  );
}
