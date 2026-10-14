import { useRef, useState } from 'react';
import type { TimeEntry } from '../../lib/types';
import { formatDisplay, formatDuration, todayISO } from '../../lib/date';
import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  SLOT_HEIGHT,
  SLOTS_PER_DAY,
  clampSlot,
  formatSlotTime,
  layoutBlock,
} from './gridMath';

interface Props {
  weekDates: string[]; // 7 ISO dates, Mon..Sun
  entries: TimeEntry[]; // timed entries only (has started_at)
  onRequestCreate: (dayISO: string, startSlot: number, endSlot: number) => void;
  onRequestEdit: (entry: TimeEntry) => void;
  onMoveEntry: (entry: TimeEntry, newDayISO: string, newStartSlot: number) => void;
}

type Interaction =
  | { kind: 'create'; dayIndex: number; anchorSlot: number; currentSlot: number }
  | {
      kind: 'move';
      entry: TimeEntry;
      originDayIndex: number;
      originStartSlot: number;
      durationSlots: number;
      anchorSlot: number;
      deltaSlots: number;
      deltaDays: number;
      moved: boolean;
    };

const HOUR_LABELS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

export function WeekGrid({ weekDates, entries, onRequestCreate, onRequestEdit, onMoveEntry }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const today = todayISO();

  function slotFromClientY(clientY: number): number {
    const rect = rowRef.current!.getBoundingClientRect();
    return clampSlot(Math.round((clientY - rect.top) / SLOT_HEIGHT));
  }

  function dayIndexFromClientX(clientX: number): number {
    const rect = rowRef.current!.getBoundingClientRect();
    const colWidth = rect.width / 7;
    return Math.max(0, Math.min(6, Math.floor((clientX - rect.left) / colWidth)));
  }

  function startCreate(dayIndex: number, clientY: number) {
    const slot = slotFromClientY(clientY);
    const next: Interaction = { kind: 'create', dayIndex, anchorSlot: slot, currentSlot: slot };
    setInteraction(next);
    attachWindowListeners();
  }

  function startMove(entry: TimeEntry, dayIndex: number, clientY: number) {
    const started = new Date(entry.started_at ?? entry.created_at);
    const ended = entry.ended_at ? new Date(entry.ended_at) : new Date(started.getTime() + entry.duration_seconds * 1000);
    const durationSlots = Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000 / 30));
    const originStartSlot = Math.round(
      ((started.getHours() - DAY_START_HOUR) * 60 + started.getMinutes()) / 30,
    );
    const anchorSlot = slotFromClientY(clientY);
    const next: Interaction = {
      kind: 'move',
      entry,
      originDayIndex: dayIndex,
      originStartSlot,
      durationSlots,
      anchorSlot,
      deltaSlots: 0,
      deltaDays: 0,
      moved: false,
    };
    setInteraction(next);
    attachWindowListeners();
  }

  function attachWindowListeners() {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  function detachWindowListeners() {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    setInteraction((prev) => {
      if (!prev) return prev;
      if (prev.kind === 'create') {
        return { ...prev, currentSlot: slotFromClientY(e.clientY) };
      }
      const slotNow = slotFromClientY(e.clientY);
      const dayNow = dayIndexFromClientX(e.clientX);
      const deltaSlots = slotNow - prev.anchorSlot;
      const deltaDays = dayNow - prev.originDayIndex;
      const moved = Math.abs(deltaSlots) >= 1 || deltaDays !== 0;
      return { ...prev, deltaSlots, deltaDays, moved };
    });
  }

  function handleMouseUp() {
    detachWindowListeners();
    setInteraction((prev) => {
      if (!prev) return null;
      if (prev.kind === 'create') {
        const start = Math.min(prev.anchorSlot, prev.currentSlot);
        const end = Math.max(prev.anchorSlot, prev.currentSlot, start + 1);
        onRequestCreate(weekDates[prev.dayIndex], start, end);
      } else if (prev.kind === 'move') {
        if (prev.moved) {
          const newDayIndex = Math.max(0, Math.min(6, prev.originDayIndex + prev.deltaDays));
          const newStart = clampSlot(prev.originStartSlot + prev.deltaSlots);
          onMoveEntry(prev.entry, weekDates[newDayIndex], Math.min(newStart, SLOTS_PER_DAY - prev.durationSlots));
        } else {
          onRequestEdit(prev.entry);
        }
      }
      return null;
    });
  }

  return (
    <div className="week-grid">
      <div className="week-grid-head">
        <div className="week-grid-gutter" />
        {weekDates.map((d) => (
          <div key={d} className={`week-grid-day-head${d === today ? ' is-today' : ''}`}>
            <div className="muted">{formatDisplay(d).slice(0, 3)}</div>
            <strong>{Number(d.slice(8, 10))}</strong>
          </div>
        ))}
      </div>

      <div className="week-grid-body">
        <div className="week-grid-gutter">
          {HOUR_LABELS.map((h) => (
            <div key={h} className="hour-label" style={{ height: SLOT_HEIGHT * 2 }}>
              {h % 12 || 12}
              {h >= 12 ? 'pm' : 'am'}
            </div>
          ))}
        </div>

        <div className="week-grid-row" ref={rowRef} style={{ height: SLOTS_PER_DAY * SLOT_HEIGHT }}>
          {weekDates.map((dayISO, dayIndex) => {
            const dayEntries = entries.filter((en) => {
              if (!en.started_at) return false;
              return en.started_at.slice(0, 10) === dayISO || en.entry_date === dayISO;
            });
            const creatingHere = interaction?.kind === 'create' && interaction.dayIndex === dayIndex;

            return (
              <div
                key={dayISO}
                className="week-grid-col"
                onMouseDown={(e) => {
                  if ((e.target as HTMLElement).closest('.cal-event')) return;
                  startCreate(dayIndex, e.clientY);
                }}
              >
                {creatingHere &&
                  (() => {
                    const start = Math.min(interaction.anchorSlot, interaction.currentSlot);
                    const end = Math.max(interaction.anchorSlot, interaction.currentSlot);
                    return (
                      <div
                        className="cal-create-preview"
                        style={{ top: start * SLOT_HEIGHT, height: Math.max(SLOT_HEIGHT, (end - start) * SLOT_HEIGHT) }}
                      >
                        {formatSlotTime(dayISO, start)} – {formatSlotTime(dayISO, end)}
                      </div>
                    );
                  })()}

                {dayEntries.map((entry) => {
                  const isMoving = interaction?.kind === 'move' && interaction.entry.id === entry.id && interaction.moved;
                  const belongsHereWhileMoving =
                    interaction?.kind === 'move' &&
                    interaction.entry.id === entry.id &&
                    Math.max(0, Math.min(6, interaction.originDayIndex + interaction.deltaDays)) === dayIndex;
                  if (interaction?.kind === 'move' && interaction.entry.id === entry.id && interaction.moved && !belongsHereWhileMoving) {
                    return null;
                  }
                  const { topPx, heightPx } = layoutBlock(entry.started_at!, entry.ended_at, dayISO);
                  const previewTop = isMoving
                    ? (interaction.kind === 'move' ? interaction.originStartSlot + interaction.deltaSlots : 0) * SLOT_HEIGHT
                    : topPx;

                  return (
                    <div
                      key={entry.id}
                      className={`cal-event domain-${entry.domain}${isMoving ? ' is-moving' : ''}`}
                      style={{ top: previewTop, height: heightPx }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        startMove(entry, dayIndex, e.clientY);
                      }}
                      title={entry.activity}
                    >
                      <span className="cal-event-title">{entry.activity}</span>
                      <span className="cal-event-time">{formatDuration(entry.duration_seconds)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}