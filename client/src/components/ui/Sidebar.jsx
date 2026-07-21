import React from 'react';

export default function Sidebar({ children }) {
  return (
    <aside className="w-64 border-r border-customBorder bg-surface h-screen p-4 flex flex-col gap-2 shrink-0 hidden md:flex">
      {children}
    </aside>
  );
}
