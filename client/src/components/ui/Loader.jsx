import React from 'react';
import { cn } from '../../utils/cn';

export default function Loader({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-surface border border-customBorder/30", className)} />;
}
