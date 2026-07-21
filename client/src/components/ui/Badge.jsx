import React from 'react';
import { cn } from '../../utils/cn';

export default function Badge({ className, variant = 'primary', children }) {
  const styles = {
    primary: 'bg-primary/20 text-primary border-primary/30',
    secondary: 'bg-secondary/20 text-secondary border-secondary/30',
    outline: 'border border-customBorder text-slate-300'
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-sans border", styles[variant], className)}>
      {children}
    </span>
  );
}
