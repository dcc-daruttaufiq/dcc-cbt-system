import React from 'react';

export default function Navbar({ children, className = '' }) {
  return (
    <header className={`w-full bg-[#080d1a]/80 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-none ${className}`}>
      {children}
    </header>
  );
}