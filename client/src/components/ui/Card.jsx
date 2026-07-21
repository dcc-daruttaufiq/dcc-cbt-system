import React from 'react';
import { cn } from '../../utils/cn';

export default function Card({ className, children, ...props }) {
  return (
    <div className={cn("bg-surface border border-customBorder/60 rounded-xl p-5 shadow-xl text-white", className)} {...props}>
      {children}
    </div>
  );
}
