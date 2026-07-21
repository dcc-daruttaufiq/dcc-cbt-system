import React from 'react';

export default function Spinner({ size = 'md' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-3', lg: 'h-12 w-12 border-4' };
  return <div className={`${sizes[size]} animate-spin rounded-full border-t-primary border-r-transparent border-b-customBorder border-l-customBorder`} />;
}
