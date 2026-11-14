// Serialized writes prevent repeat requests from concurrent tab focus events.
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
const KEY = "zikirmatik:review-policy:v1";
type Record = { sessions: number; completions: number; requestedVersion: string | null };
export function createReviewPolicy(storage: Storage) {
  let record: Record | null = null;
  let sessionStarted = false;
  let queue = Promise.resolve();
  const serialize = <T>(operation: () => Promise<T>) => {
    const next = queue.then(operation);
    queue = next.then(() => {}, () => {});
    return next;
  };
  const save = async (next: Record) => {
    await storage.setItem(KEY, JSON.stringify(next));
    record = next;
  };
  const begin = async () => {
    if (sessionStarted) return;
    const raw = await storage.getItem(KEY);
    const old = raw === null ? { sessions: 0, completions: 0, requestedVersion: null } : JSON.parse(raw);
    if (!old || !Number.isSafeInteger(old.sessions) || old.sessions < 0 ||
        !Number.isSafeInteger(old.completions) || old.completions < 0 ||
        (old.requestedVersion !== null && typeof old.requestedVersion !== "string")) throw Error("Invalid review state");
    await save({ ...old, sessions: Math.min(2, old.sessions + 1) });
    sessionStarted = true;
  };
  return {
    startSession: () => serialize(begin),
    completeGoal: () => serialize(async () => {
      await begin();
      if (record && record.completions < 2) await save({ ...record, completions: record.completions + 1 });
    }),
    reserve: (version: string, stillEligible: () => boolean) => serialize(async () => {
      await begin();
      if (!record || record.sessions < 2 || record.completions < 2 ||
          record.requestedVersion === version || !version || !stillEligible()) return false;
      // Reserve before calling Play. It deliberately does not report whether a dialog appeared.
      await save({ ...record, requestedVersion: version });
      return true;
    }),
  };
}
