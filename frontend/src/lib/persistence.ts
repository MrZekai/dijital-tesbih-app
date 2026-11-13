import { defaultState, migrateState, STORAGE_KEY, type PersistedState } from "./migration";

export interface StateStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

/** Read errors and invalid records must never become an empty installation. */
export async function readState(storage: StateStorage): Promise<PersistedState> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (raw === null) return defaultState();
  let decoded: unknown = JSON.parse(raw);
  // Older releases used the JSON storage wrapper around a JSON string.
  if (typeof decoded === "string") decoded = JSON.parse(decoded);
  const state = migrateState(decoded);
  if (!state) throw new Error("Unrecognized saved state; original record preserved");
  return state;
}

/** One write at a time; newer snapshots replace queued ones, never in-flight ones. */
export function createStateWriter(storage: StateStorage, onError: (failed: boolean) => void) {
  let pending: PersistedState | null = null;
  let running: Promise<void> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let disposed = false;

  async function drain() {
    while (pending && !disposed) {
      const snapshot = pending;
      pending = null;
      try {
        // Keep the legacy on-disk encoding so installed older versions can read it.
        await storage.setItem(STORAGE_KEY, JSON.stringify(JSON.stringify(snapshot)));
        failures = 0;
        if (!disposed) onError(false);
      } catch {
        pending ??= snapshot;
        failures += 1;
        if (!disposed) onError(true);
        if (failures <= 3 && !disposed) {
          retry = setTimeout(() => { retry = null; void flush(); }, 1000 * 2 ** (failures - 1));
        }
        break;
      }
    }
  }
  function flush(): Promise<void> {
    if (disposed) return Promise.resolve();
    if (retry) { clearTimeout(retry); retry = null; }
    if (!running) running = drain().finally(() => { running = null; });
    return running;
  }
  return {
    enqueue(state: PersistedState) { pending = state; },
    flush,
    retry() { failures = 0; return flush(); },
    dispose() { disposed = true; if (retry) clearTimeout(retry); },
  };
}
