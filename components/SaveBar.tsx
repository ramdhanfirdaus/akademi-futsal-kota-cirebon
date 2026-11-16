import React from 'react';
import { Save } from 'lucide-react';

/**
 * Toolbar placed directly above an editable table: hints/legend on the left,
 * the save button on the right, so it sits where the editing happens.
 */
export default function SaveBar({
  onSave,
  disabled,
  saving,
  children,
}: {
  onSave: () => void;
  disabled?: boolean;
  saving?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-laut/10 bg-laut-muda/50 p-3 md:flex-row md:items-center md:justify-between md:p-4">
      <div className="min-w-0">{children}</div>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled || saving}
        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-laut-dalam px-5 py-2.5 font-bold text-white shadow-lg shadow-laut-dalam/20 transition-colors hover:bg-laut disabled:bg-slate-300 disabled:shadow-none md:w-auto"
      >
        <Save size={18} aria-hidden />
        {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
      </button>
    </div>
  );
}
