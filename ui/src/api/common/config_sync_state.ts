export interface ConfigSnapshot<T> {
  runtimeId: string;
  revision: number;
  values: T;
}

export interface ConfigPatch<T extends object> {
  set: Partial<T>;
  remove?: Array<keyof T>;
}

export interface PendingConfigMutation<T extends object> {
  mutationId: string;
  patch: ConfigPatch<T>;
}

export interface ConfigSyncState<T extends object> {
  committed: ConfigSnapshot<T> | null;
  pending: PendingConfigMutation<T>[];
  values: T;
}

function applyPatch<T extends object>(values: T, patch: ConfigPatch<T>): T {
  const next = { ...values } as Record<string, unknown>;
  for (const key of patch.remove ?? []) {
    delete next[String(key)];
  }
  for (const [key, value] of Object.entries(patch.set)) {
    next[key] = value;
  }
  return next as T;
}

function deriveValues<T extends object>(
  committed: ConfigSnapshot<T> | null,
  pending: PendingConfigMutation<T>[],
): T {
  let values = committed?.values ?? ({} as T);
  for (const mutation of pending) {
    values = applyPatch(values, mutation.patch);
  }
  return values;
}

function withState<T extends object>(
  committed: ConfigSnapshot<T> | null,
  pending: PendingConfigMutation<T>[],
): ConfigSyncState<T> {
  return { committed, pending, values: deriveValues(committed, pending) };
}

export function createConfigSyncState<T extends object>(
  initialSnapshot: ConfigSnapshot<T> | null = null,
): ConfigSyncState<T> {
  return withState(initialSnapshot, []);
}

export function applySnapshot<T extends object>(
  state: ConfigSyncState<T>,
  snapshot: ConfigSnapshot<T>,
): ConfigSyncState<T> {
  const current = state.committed;
  const shouldAccept =
    current === null ||
    current.runtimeId !== snapshot.runtimeId ||
    snapshot.revision > current.revision;
  if (!shouldAccept) {
    return state;
  }
  return withState(snapshot, state.pending);
}

export function beginMutation<T extends object>(
  state: ConfigSyncState<T>,
  mutationId: string,
  patch: ConfigPatch<T>,
): ConfigSyncState<T> {
  if (state.pending.some((mutation) => mutation.mutationId === mutationId)) {
    return state;
  }
  return withState(state.committed, [...state.pending, { mutationId, patch }]);
}

export function resolveMutation<T extends object>(
  state: ConfigSyncState<T>,
  mutationId: string,
  responseSnapshot: ConfigSnapshot<T>,
): ConfigSyncState<T> {
  const withResponse = applySnapshot(state, responseSnapshot);
  const pending = withResponse.pending.filter((mutation) => mutation.mutationId !== mutationId);
  if (pending.length === withResponse.pending.length) {
    return withResponse;
  }
  return withState(withResponse.committed, pending);
}

export function rejectMutation<T extends object>(
  state: ConfigSyncState<T>,
  mutationId: string,
): ConfigSyncState<T> {
  const pending = state.pending.filter((mutation) => mutation.mutationId !== mutationId);
  return pending.length === state.pending.length ? state : withState(state.committed, pending);
}
