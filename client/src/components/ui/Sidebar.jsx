import React from 'react';

export default function Sidebar({ children, className = '' }) {
  return (
    // Benar-benar tanpa border, murni mengandalkan kontras warna background
    <aside className={`w-64 bg-[#080d1a]/80 backdrop-blur-md min-h-screen p-5 flex flex-col gap-3 shrink-0 hidden md:flex ${className}`}>
      {children}
    </aside>
  );
}