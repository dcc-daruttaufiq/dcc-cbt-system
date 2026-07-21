import React from 'react';
import { cn } from '../../utils/cn';

export default function Button({ className, variant = 'primary', size = 'md', children, ...props }) {
  const baseStyles = 'inline-flex items-center justify-center font-sans font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    primary: 'bg-primary text-darkBg hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20',
    secondary: 'bg-secondary text-darkBg hover:bg-secondary/90 font-semibold',
    outline: 'border border-customBorder text-primary hover:bg-primary/10 bg-transparent',
    ghost: 'text-slate-300 hover:bg-surface hover:text-white'
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
