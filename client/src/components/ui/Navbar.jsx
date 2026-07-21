import React from 'react';

export default function Navbar({ children, className = '' }) {
  return (
    <header className={`w-full bg-[#080d1a]/50 backdrop-blur-md px-6 py-4 flex items-center justify-between ${className}`}>
      {children}
    </header>
  );
}