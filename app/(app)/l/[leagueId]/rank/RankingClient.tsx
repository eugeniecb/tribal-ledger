"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Check } from "lucide-react";

interface Castaway {
  id: string;
  name: string;
  image_url: string | null;
  tribe: string | null;
  is_eliminated: boolean;
}

interface Props {
  initialOrder: Castaway[];
  memberId: string;
  leagueId: string;
}

export default function RankingClient({ initialOrder, memberId, leagueId }: Props) {
  const [items, setItems] = useState(initialOrder);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((c) => c.id === active.id);
        const newIndex = prev.findIndex((c) => c.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
      setSaved(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const rankings = items.map((c, i) => ({ castaway_id: c.id, rank: i + 1 }));
      const res = await fetch("/api/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, league_id: leagueId, rankings }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2 mb-6">
            {items.map((castaway, index) => (
              <SortableItem key={castaway.id} castaway={castaway} rank={index + 1} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-torch text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-torch-dark disabled:opacity-50 transition-colors"
      >
        {saved ? <><Check size={15} /> Saved</> : saving ? "Saving…" : "Save Rankings"}
      </button>
    </div>
  );
}

function SortableItem({ castaway, rank }: { castaway: Castaway; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: castaway.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white border border-sand-dark rounded-lg px-4 py-3 ${castaway.is_eliminated ? "opacity-50" : ""}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-jungle-mid hover:text-jungle touch-none">
        <GripVertical size={18} />
      </button>
      <span className="w-7 text-right text-sm font-mono text-jungle-mid flex-shrink-0">{rank}.</span>
      <div className="w-8 h-8 rounded-full bg-sand-dark overflow-hidden flex-shrink-0">
        {castaway.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={castaway.image_url} alt={castaway.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-jungle-mid">
            {castaway.name[0]}
          </div>
        )}
      </div>
      <span className={`text-sm font-medium ${castaway.is_eliminated ? "line-through text-jungle-mid" : "text-jungle"}`}>
        {castaway.name}
      </span>
      {castaway.tribe && <span className="text-xs text-jungle-mid ml-auto">{castaway.tribe}</span>}
    </li>
  );
}
