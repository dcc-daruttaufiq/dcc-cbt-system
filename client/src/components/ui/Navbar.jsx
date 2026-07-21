import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function Navbar({ children }) {
  return (
    <nav className="w-full border-b border-customBorder bg-surface px-6 h-16 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-7 h-7 text-primary" />
        <span className="font-display text-2xl font-bold text-white tracking-widest">DCC-CBT</span>
      </div>
      <div className="flex items-center gap-4 text-white font-sans text-sm">{children}</div>
    </nav>
  );
}
