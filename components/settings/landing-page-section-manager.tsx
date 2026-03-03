'use client';

import { GripVertical } from 'lucide-react';
import { Switch } from '@/components/shared/ui/switch';
import { SECTION_LABELS } from '@/lib/types/landing';
import type { LandingPageSection, LandingSectionId } from '@/lib/types/landing';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SectionManagerProps {
  sections: LandingPageSection[];
  onChange: (sections: LandingPageSection[]) => void;
}

function SortableItem({
  section,
  onToggle,
}: {
  section: LandingPageSection;
  onToggle: (id: LandingSectionId, enabled: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <button
        type="button"
        className="cursor-grab text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-body text-text-primary-light dark:text-text-primary-dark">
        {SECTION_LABELS[section.id]}
      </span>
      <Switch
        checked={section.enabled}
        onCheckedChange={(checked) => onToggle(section.id, checked)}
      />
    </div>
  );
}

export function LandingPageSectionManager({ sections, onChange }: SectionManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sorted = [...sections].sort((a, b) => a.order - b.order);

  function handleToggle(id: LandingSectionId, enabled: boolean) {
    onChange(sections.map((s) => (s.id === id ? { ...s, enabled } : s)));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((s) => s.id === active.id);
    const newIndex = sorted.findIndex((s) => s.id === over.id);

    const reordered = [...sorted];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onChange(reordered.map((s, i) => ({ ...s, order: i })));
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sorted.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sorted.map((section) => (
            <SortableItem
              key={section.id}
              section={section}
              onToggle={handleToggle}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
