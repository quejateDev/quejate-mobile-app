import { create } from 'zustand';

export type DebugKind = 'req' | 'res' | 'err' | 'info';

export interface DebugEntry {
  id: number;
  ts: string;
  kind: DebugKind;
  text: string;
}

const MAX_ENTRIES = 100;
let counter = 0;

interface DebugState {
  entries: DebugEntry[];
  add: (kind: DebugKind, text: string) => void;
  clear: () => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  entries: [],
  add: (kind, text) =>
    set((s) => {
      const entry: DebugEntry = {
        id: ++counter,
        ts: new Date().toISOString().slice(11, 23),
        kind,
        text,
      };
      const next = [entry, ...s.entries];
      if (next.length > MAX_ENTRIES) next.length = MAX_ENTRIES;
      return { entries: next };
    }),
  clear: () => set({ entries: [] }),
}));

// Non-hook accessor: safe to call from interceptors and other non-React modules.
export function debugLog(kind: DebugKind, text: string): void {
  useDebugStore.getState().add(kind, text);
}

export function maskToken(token: string | null | undefined): string {
  if (!token) return '<none>';
  if (token.length <= 12) return `<short len=${token.length}>`;
  return `${token.slice(0, 8)}…${token.slice(-6)} (len=${token.length})`;
}
