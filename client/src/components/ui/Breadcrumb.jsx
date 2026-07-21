import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="flex items-center gap-2 font-sans text-xs text-slate-400 py-2">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
          <span className={i === items.length - 1 ? "text-primary font-medium" : "hover:text-white cursor-pointer"}>
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}
