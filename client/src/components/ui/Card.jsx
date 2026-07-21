import React from 'react';

export default function Card({ children, className = '' }) {
  return (
    // Pakai shadow & background halus tanpa border sama sekali
    <div className={`bg-[#0d1527]/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg ${className}`}>
      {children}
    </div>
  );
}