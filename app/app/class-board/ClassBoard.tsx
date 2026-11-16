'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ArrowRight, Check, ChevronLeft, ChevronRight, GripVertical, RotateCcw, Save, Search, X } from 'lucide-react';

import { ClassBoardService } from '@/services';
import type { BoardColumn } from '@/services/ClassBoardService';
import { apiErrorMessage } from '@/services/errors';
import { LoadingSpinner, useNotification } from '@/components';
import { classLabel } from '@/lib/format';
import { AppHeader } from '@/components';

type Student = { id: number; name: string; nickname: string | null };

const byName = (a: Student, b: Student) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });

function useBoard() {
  const [columns, setColumns] = useState<{ id: number; name: string }[]>([]);
  const [students, setStudents] = useState<Map<number, Student>>(new Map());
  const [original, setOriginal] = useState<Map<number, number>>(new Map());
  const [placement, setPlacement] = useState<Map<number, number>>(new Map());

  const load = useCallback((board: BoardColumn[]) => {
    setColumns(board.map(({ id, name }) => ({ id, name })));
    const meta = new Map<number, Student>();
    const place = new Map<number, number>();
    for (const c of board) for (const s of c.students) {
      meta.set(s.id, s);
      place.set(s.id, c.id);
    }
    setStudents(meta);
    setOriginal(place);
    setPlacement(new Map(place));
  }, []);

  const changes = useMemo(
    () => [...placement].filter(([sid, cid]) => original.get(sid) !== cid).map(([student_id, class_id]) => ({ student_id, class_id })),
    [placement, original],
  );

  const move = (ids: number[], classId: number) =>
    setPlacement((prev) => {
      const next = new Map(prev);
      for (const id of ids) next.set(id, classId);
      return next;
    });

  return { columns, students, original, placement, changes, load, move, reset: () => setPlacement(new Map(original)) };
}

export default function ClassBoard() {
  const { showNotification } = useNotification();
  const board = useBoard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState<number[] | null>(null);
  const [target, setTarget] = useState('');
  const scroller = useHorizontalScroll(board.columns.length);

  useEffect(() => {
    ClassBoardService.getBoard()
      .then((res) => board.load(res.data))
      .catch((e) => showNotification({ type: 'error', message: apiErrorMessage(e) }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving with unsaved moves.
  const dirty = board.changes.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const className = (id: number | undefined) => board.columns.find((c) => c.id === id)?.name ?? '';
  const q = query.trim().toLowerCase();
  const visible = (s: Student) => !q || s.name.toLowerCase().includes(q) || (s.nickname ?? '').toLowerCase().includes(q);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onDragStart = (e: DragStartEvent) => {
    const id = Number(e.active.id);
    // Dragging a selected card carries the whole selection along.
    setDragging(selected.has(id) ? [...selected] : [id]);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const ids = dragging ?? [];
    setDragging(null);
    if (!e.over) return;
    board.move(ids, Number(String(e.over.id).replace('col-', '')));
    setSelected(new Set());
  };

  const moveSelected = () => {
    if (!target || selected.size === 0) return;
    board.move([...selected], Number(target));
    setSelected(new Set());
    setTarget('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await ClassBoardService.save(board.changes);
      board.load(res.data.board);
      showNotification({ type: 'success', message: `${res.data.moved} siswa berhasil dipindahkan` });
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Memuat kelas..." />;

  return (
    <div className="space-y-4">
      <AppHeader
        title="Pindah Kelas"
        subtitle="Seret kartu siswa ke kelas lain, atau centang beberapa siswa lalu pilih kelas tujuan. Perubahan tersimpan setelah menekan Simpan."
      >
        <label className="relative block w-full md:w-72">
          <span className="sr-only">Cari siswa</span>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama siswa"
            className="w-full rounded-lg border-2 border-slate-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-laut focus:outline-none"
          />
        </label>
      </AppHeader>

      {board.columns.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Belum ada kelas. Buat kelas dulu di menu Kelas.</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-500">{board.columns.length} kelas</p>
            {(scroller.canLeft || scroller.canRight) && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => scroller.by(-1)}
                  disabled={!scroller.canLeft}
                  aria-label="Geser ke kelas sebelumnya"
                  className="rounded-full border-2 border-slate-200 bg-white p-1.5 text-laut-dalam hover:border-laut disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => scroller.by(1)}
                  disabled={!scroller.canRight}
                  aria-label="Geser ke kelas berikutnya"
                  className="rounded-full border-2 border-slate-200 bg-white p-1.5 text-laut-dalam hover:border-laut disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
          <div
            ref={scroller.ref}
            className="board-scroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:snap-none md:px-0"
          >
            {board.columns.map((col) => {
              const list = [...board.placement]
                .filter(([, cid]) => cid === col.id)
                .map(([sid]) => board.students.get(sid)!)
                .sort(byName);
              return (
                <Column key={col.id} id={col.id} name={col.name} count={list.length}>
                  {list.filter(visible).map((s) => {
                    const from = board.original.get(s.id);
                    return (
                      <Card
                        key={s.id}
                        student={s}
                        movedFrom={from !== col.id ? className(from) : null}
                        selected={selected.has(s.id)}
                        dimmed={!!dragging?.includes(s.id)}
                        onToggle={() => toggle(s.id)}
                      />
                    );
                  })}
                  {list.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-400">Letakkan siswa di sini</p>}
                </Column>
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {dragging && (
              <div className="w-60 rotate-2 rounded-lg border-2 border-laut bg-white px-3 py-2.5 shadow-lg">
                <p className="font-bold text-laut-dalam">{board.students.get(dragging[0])?.name}</p>
                {dragging.length > 1 && <p className="text-sm text-slate-500">+{dragging.length - 1} siswa lain</p>}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Action bar: selection on the left, save on the right. Sits above the phone tab bar. */}
      {(selected.size > 0 || dirty) && (
        <div className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:bottom-4 md:flex-row md:items-center md:justify-between">
          {selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-laut-dalam">{selected.size} dipilih</span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                aria-label="Kelas tujuan"
                className="rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-laut focus:outline-none"
              >
                <option value="">Pindahkan ke…</option>
                {board.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {classLabel(c.name)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={moveSelected}
                disabled={!target}
                className="inline-flex items-center gap-1.5 rounded-lg bg-laut px-3 py-1.5 text-sm font-bold text-white disabled:bg-slate-300"
              >
                <ArrowRight size={16} aria-hidden /> Pindahkan
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
                <X size={16} aria-hidden /> Batal pilih
              </button>
            </div>
          ) : (
            <span />
          )}
          {dirty && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">
                <strong className="text-laut-dalam">{board.changes.length}</strong> perpindahan belum disimpan
              </span>
              <button
                type="button"
                onClick={board.reset}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm font-bold text-laut-dalam hover:border-slate-300"
              >
                <RotateCcw size={16} aria-hidden /> Batalkan
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-laut-dalam px-4 py-1.5 text-sm font-bold text-white hover:bg-laut disabled:bg-slate-400"
              >
                <Save size={16} aria-hidden /> {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Tracks whether a horizontal scroller can move left/right, and scrolls it by about one column. */
function useHorizontalScroll(columnCount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ canLeft: false, canRight: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = { canLeft: el.scrollLeft > 4, canRight: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 };
      // Only re-render when an edge actually changes.
      setEdges((prev) => (prev.canLeft === next.canLeft && prev.canRight === next.canRight ? prev : next));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [columnCount]);
  const by = (dir: number) => ref.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
  return { ref, ...edges, by };
}

function Column({ id, name, count, children }: { id: number; name: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${id}` });
  return (
    <section
      ref={setNodeRef}
      aria-label={classLabel(name)}
      className={`flex w-[82vw] max-w-[18rem] shrink-0 snap-start flex-col rounded-xl border-2 transition-colors sm:w-72 ${
        isOver ? 'border-laut bg-laut-muda' : 'border-transparent bg-slate-100'
      }`}
    >
      <h3 className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="font-bold text-laut-dalam">{classLabel(name)}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-600">{count}</span>
      </h3>
      <ul className="flex max-h-[60vh] min-h-[6rem] flex-col gap-2 overflow-y-auto px-2 pb-2">{children}</ul>
    </section>
  );
}

function Card({
  student,
  movedFrom,
  selected,
  dimmed,
  onToggle,
}: {
  student: Student;
  movedFrom: string | null;
  selected: boolean;
  dimmed: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: student.id });
  return (
    <li
      ref={setNodeRef}
      className={`flex items-center gap-2 rounded-lg border bg-white px-2 py-2 transition-opacity ${dimmed ? 'opacity-40' : ''} ${
        selected ? 'border-laut ring-2 ring-laut/30' : movedFrom ? 'border-pantai' : 'border-slate-200'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={selected ? `Batal pilih ${student.name}` : `Pilih ${student.name}`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${selected ? 'border-laut bg-laut text-white' : 'border-slate-300'}`}
      >
        {selected && <Check size={14} aria-hidden />}
      </button>
      <div
        {...listeners}
        {...attributes}
        aria-label={`Seret ${student.name}`}
        // Touch: press-and-hold anywhere (scrolling still works), or grab the grip to drag at once.
        className="flex min-w-0 flex-1 cursor-grab touch-manipulation items-center gap-2 active:cursor-grabbing"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-laut-dalam">{student.name}</p>
          {movedFrom ? (
            <p className="truncate text-xs font-bold text-amber-700">Dari {classLabel(movedFrom)}</p>
          ) : (
            student.nickname && <p className="truncate text-xs text-slate-500">{student.nickname}</p>
          )}
        </div>
        <span className="flex h-8 w-6 shrink-0 touch-none items-center justify-center text-slate-400" aria-hidden>
          <GripVertical size={16} />
        </span>
      </div>
    </li>
  );
}
