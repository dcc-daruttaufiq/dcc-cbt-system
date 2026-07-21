import React from 'react';

export default function Navbar({ children, className = '' }) {
  return (
    <header className={`w-full bg-[#080d1a]/40 backdrop-blur-md border-b border-slate-800/40 px-6 py-4 flex items-center justify-between ${className}`}>
      {children}
    </header>
  );
}