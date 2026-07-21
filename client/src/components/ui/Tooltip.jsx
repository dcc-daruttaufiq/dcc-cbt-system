import React, { useState } from 'react';

export default function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className="absolute z-50 px-2 py-1 text-xs font-sans text-darkBg bg-primary rounded shadow-md -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          {text}
        </div>
      )}
    </div>
  );
}
