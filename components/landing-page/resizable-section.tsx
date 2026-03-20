'use client';

import { useRef, useState, useCallback } from 'react';
import type { LandingSectionId, SectionStyleOverride } from '@/lib/types/landing';
import { SECTION_LABELS } from '@/lib/types/landing';
import { GripHorizontal, Columns3 } from 'lucide-react';

interface ResizableSectionProps {
  sectionId: LandingSectionId;
  scale: number;
  canResizeHeight: boolean;
  canResizeColumns: boolean;
  currentHeight?: number;
  currentColumns?: number;
  onResize: (changes: Partial<SectionStyleOverride>) => void;
  children: React.ReactNode;
}

export function ResizableSection({
  sectionId,
  scale,
  canResizeHeight,
  canResizeColumns,
  currentHeight,
  currentColumns,
  onResize,
  children,
}: ResizableSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleHeightDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const startY = e.clientY;
      const startHeight = currentHeight || containerRef.current?.offsetHeight || 400;

      function onPointerMove(ev: PointerEvent) {
        const delta = (ev.clientY - startY) / scale;
        const newHeight = Math.max(120, Math.round(startHeight + delta));
        onResize({ height: newHeight });
      }

      function onPointerUp() {
        setIsDragging(false);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    },
    [scale, currentHeight, onResize]
  );

  const handleColumnChange = useCallback(
    (delta: number) => {
      const current = currentColumns || 3;
      const newCols = Math.max(1, Math.min(6, current + delta));
      onResize({ columns: newCols });
    },
    [currentColumns, onResize]
  );

  // Apply height override directly so dragging has a visible effect
  const wrapperStyle: React.CSSProperties = {};
  if (canResizeHeight && currentHeight) {
    wrapperStyle.height = currentHeight;
    wrapperStyle.overflow = 'hidden';
  }

  return (
    <div
      ref={containerRef}
      className="relative group"
      style={wrapperStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isDragging && setIsHovered(false)}
    >
      {/* Section label */}
      {(isHovered || isDragging) && (
        <div className="absolute top-2 left-2 z-20 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded shadow-sm pointer-events-none">
          {SECTION_LABELS[sectionId]}
        </div>
      )}

      {/* Outline */}
      {(isHovered || isDragging) && (
        <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded-sm pointer-events-none z-10" />
      )}

      {/* Column controls */}
      {canResizeColumns && (isHovered || isDragging) && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white shadow-md rounded-md border border-gray-200 px-1.5 py-0.5">
          <Columns3 className="h-3.5 w-3.5 text-gray-500" />
          <button
            type="button"
            className="h-5 w-5 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 rounded"
            onClick={() => handleColumnChange(-1)}
          >
            −
          </button>
          <span className="text-xs font-mono text-gray-700 min-w-[1rem] text-center">
            {currentColumns || 3}
          </span>
          <button
            type="button"
            className="h-5 w-5 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 rounded"
            onClick={() => handleColumnChange(1)}
          >
            +
          </button>
        </div>
      )}

      {children}

      {/* Height drag handle */}
      {canResizeHeight && (isHovered || isDragging) && (
        <div
          className="absolute bottom-0 left-0 right-0 h-3 z-20 cursor-row-resize flex items-center justify-center hover:bg-blue-400/20 transition-colors"
          onPointerDown={handleHeightDrag}
        >
          <div className="bg-blue-500 rounded-full px-3 py-0.5 shadow-sm">
            <GripHorizontal className="h-3 w-3 text-white" />
          </div>
        </div>
      )}

      {/* Height indicator */}
      {isDragging && currentHeight && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white text-xs font-mono px-2 py-1 rounded shadow-sm pointer-events-none">
          {currentHeight}px
        </div>
      )}
    </div>
  );
}
