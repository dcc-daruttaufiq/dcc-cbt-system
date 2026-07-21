import React from 'react';

export default function Progress({ value = 0, max = 100 }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="w-full bg-surface border border-customBorder h-3 rounded-full overflow-hidden">
      <div className="bg-gradient-to-r from-secondary to-primary h-full transition-all duration-300" style={{ width: `${percentage}%` }} />
    </div>
  );
}
