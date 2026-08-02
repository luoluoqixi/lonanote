export type DateInput = Date | number | string;

const DEFAULT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

const DEFAULT_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * 将 Date、毫秒时间戳或 ISO 日期字符串格式化为设备本地日期时间字符串。
 *
 * 无法解析的日期返回 `null`，以便调用方决定空状态文案。
 */
export function formatDateTime(
  value: DateInput,
  options?: Intl.DateTimeFormatOptions,
): string | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (!options) {
    return `${date.toLocaleDateString(undefined, DEFAULT_DATE_FORMAT_OPTIONS)} ${date.toLocaleTimeString(undefined, DEFAULT_TIME_FORMAT_OPTIONS)}`;
  }

  return date.toLocaleString(undefined, options);
}

/** 将 Rust Workspace DTO 的 Unix 秒时间戳格式化为设备本地日期时间字符串。 */
export function formatUnixSecondsDateTime(
  value: number | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return formatDateTime(value * 1000, options);
}
