import React from 'react';

export default function Sidebar({ children, className = '' }) {
  return (
    <aside className={`w-64 border-r border-customBorder bg-surface min-h-screen p-4 flex flex-col gap-2 shrink-0 ${className}`}>
      {children}
    </aside>
  );
}