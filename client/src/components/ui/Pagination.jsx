import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-sans text-slate-400 px-2">
        Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong>
      </span>
      <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
