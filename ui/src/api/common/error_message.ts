/** Rust / Native 可能抛出字符串或结构化对象，保留其可读错误信息。 */
export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === "string") return error.trim() || fallbackMessage;
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // 无法序列化的错误仍使用默认文案，原始对象由调用方写入 console。
    }
  }
  return fallbackMessage;
}
