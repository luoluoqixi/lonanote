import type { ResolvedFont } from "@/api/commands/fonts/types";

type Probe = { id: number; font: ResolvedFont };
let sequence = 0;
let current: Probe | null = null;
const queue: {
  request: Probe;
  resolve(): void;
  reject(error: Error): void;
  timeout?: ReturnType<typeof setTimeout>;
}[] = [];
const listeners = new Set<() => void>();
function publish() {
  current = queue[0]?.request ?? null;
  const first = queue[0];
  if (first && !first.timeout) {
    first.timeout = setTimeout(
      () => fontProbe.finish(first.request.id, "字体加载超时，请重试"),
      15000,
    );
  }
  listeners.forEach((listener) => listener());
}

export const fontProbe = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => current,
  load(font: ResolvedFont): Promise<void> {
    if (!font.faces.length) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const request = { id: ++sequence, font };
      const item = {
        request,
        resolve,
        reject,
        timeout: undefined as ReturnType<typeof setTimeout> | undefined,
      };
      queue.push(item);
      publish();
    });
  },
  finish(id: number, error?: string) {
    const index = queue.findIndex((item) => item.request.id === id);
    if (index < 0) return;
    const [item] = queue.splice(index, 1);
    clearTimeout(item.timeout);
    if (error) item.reject(new Error(error));
    else item.resolve();
    publish();
  },
};
