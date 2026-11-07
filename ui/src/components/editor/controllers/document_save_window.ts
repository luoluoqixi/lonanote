const requestingWindows = new Map<string, string>();
export function getDocumentSaveWindow(documentId: string) {
  return requestingWindows.get(documentId);
}
export async function withDocumentSaveWindow<T>(
  documentId: string,
  windowLabel: string,
  task: () => Promise<T>,
): Promise<T> {
  if (requestingWindows.has(documentId)) return task();
  requestingWindows.set(documentId, windowLabel);
  try {
    return await task();
  } finally {
    requestingWindows.delete(documentId);
  }
}
