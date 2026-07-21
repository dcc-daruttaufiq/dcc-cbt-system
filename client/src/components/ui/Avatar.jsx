import React from 'react';
import { cn } from '../../utils/cn';

export default function Avatar({ src, fallback, className }) {
  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-customBorder bg-surface items-center justify-center", className)}>
      {src ? <img src={src} className="h-full w-full object-cover" alt="Avatar" /> : <span className="font-display font-bold text-sm text-primary uppercase">{fallback || 'U'}</span>}
    </div>
  );
}
