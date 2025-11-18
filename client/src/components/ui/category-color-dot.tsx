import React from 'react';
import { cn } from '@/lib/utils';

interface CategoryColorDotProps {
  color: string;
  className?: string;
}

/**
 * A component that renders a colored dot for category visualization
 * Uses data attributes to avoid inline styles
 */
export const CategoryColorDot: React.FC<CategoryColorDotProps> = ({ 
  color, 
  className 
}) => {
  return (
    <div 
      className={cn("w-3 h-3 rounded-full category-color-dot", className)}
      data-color={color}
    />
  );
};
