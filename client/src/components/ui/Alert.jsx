import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Alert({ variant = 'info', children, className }) {
  const styles = {
    info: 'bg-primary/10 border-primary text-primary',
    success: 'bg-emerald-500/10 border-emerald-500 text-emerald-400',
    danger: 'bg-red-500/10 border-red-500 text-red-400'
  };
  return (
    <div className={cn("flex items-start gap-3 p-4 border rounded-lg font-sans text-sm", styles[variant], className)}>
      {variant === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}
