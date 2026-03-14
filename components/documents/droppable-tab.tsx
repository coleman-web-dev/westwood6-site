'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableTabProps {
  id: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function DroppableTab({ id, label, isActive, onClick }: DroppableTabProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-pill text-label font-medium transition-all whitespace-nowrap ${
        isActive
          ? 'bg-secondary-400/20 text-secondary-700 dark:text-secondary-300'
          : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
      }${isOver ? ' ring-2 ring-secondary-400 bg-secondary-400/10' : ''}`}
    >
      {label}
    </button>
  );
}
