import React from 'react';

export default function Sidebar({ children, className = '' }) {
  return (
    <aside className={`w-64 bg-[#080d1a]/60 backdrop-blur-md min-h-screen p-5 flex flex-col gap-3 shrink-0 border-r border-slate-800/40 hidden md:flex ${className}`}>
      {children}
    </aside>
  );
}