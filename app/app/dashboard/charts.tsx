'use client';

import React from 'react';

/** One-hue horizontal bars: value at the tip, hover/focus shows the detail line. */
export function BarList({
  rows,
  format = (v) => String(v),
  max,
  onSelect,
  selectedKey,
  emptyText = 'Belum ada data',
}: {
  rows: { key: string | number; label: string; value: number | null; detail?: string }[];
  format?: (v: number) => string;
  max?: number;
  onSelect?: (key: string | number) => void;
  selectedKey?: string | number;
  emptyText?: string;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value ?? 0));
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p>;
  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const width = r.value === null ? 0 : Math.max(r.value > 0 ? 2 : 0, (r.value / top) * 100);
        const selected = selectedKey !== undefined && selectedKey === r.key;
        const body = (
          <>
            <span className="w-24 shrink-0 truncate text-left text-sm text-slate-700 sm:w-28">{r.label}</span>
            <span className="relative flex h-6 flex-1 items-center">
              <span
                className={`h-3.5 rounded-r ${selected ? 'bg-laut-dalam' : 'bg-laut'} transition-[width] duration-300`}
                style={{ width: `${width}%` }}
              />
              <span className="ml-2 shrink-0 text-sm font-bold tabular-nums text-laut-dalam">
                {r.value === null ? '–' : format(r.value)}
              </span>
            </span>
          </>
        );
        const cls = `group flex w-full items-center gap-3 rounded-md px-2 py-1 ${selected ? 'bg-laut-muda' : ''}`;
        return (
          <li key={r.key} title={r.detail}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(r.key)}
                aria-pressed={selected}
                className={`${cls} hover:bg-laut-muda focus-visible:outline focus-visible:outline-2 focus-visible:outline-laut`}
              >
                {body}
              </button>
            ) : (
              <div className={`${cls} hover:bg-slate-50`}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** A whole split into parts (2–3 segments), with a legend that carries the numbers. */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string; icon?: React.ReactNode }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div>
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
        {total === 0 ? (
          <div className="h-full w-full bg-slate-100" />
        ) : (
          parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <div
                key={p.label}
                className="h-full first:rounded-l last:rounded-r"
                style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }}
                title={`${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`}
              />
            ))
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            {p.icon ?? <span aria-hidden className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.color }} />}
            <span>{p.label}</span>
            <span className="font-bold tabular-nums text-laut-dalam">{p.value}</span>
            {total > 0 && <span className="tabular-nums text-slate-500">({Math.round((p.value / total) * 100)}%)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatTile({ label, value, note, icon }: { label: string; value: string; note?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span aria-hidden className="text-laut">{icon}</span>
        {label}
      </div>
      <p className="mt-2 font-display text-4xl font-black tabular-nums text-laut-dalam md:text-5xl">{value}</p>
      {note && <p className="mt-1 text-sm text-slate-500">{note}</p>}
    </div>
  );
}

export function Panel({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-laut-dalam">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
