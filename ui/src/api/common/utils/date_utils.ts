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

const RELATIVE_DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

const RELATIVE_DATE_WEEKDAY_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
};

const RELATIVE_DATE_CALENDAR_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
};

function getCalendarDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

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

/** 将 Rust Workspace DTO 的 Unix 秒时间戳格式化为完整的设备本地日期时间字符串。 */
export function formatUnixSecondsFullDateTime(
  value: number | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return formatDateTime(value * 1000, options);
}

/** 按本地日历距离格式化 Rust Workspace DTO 的 Unix 秒时间戳。 */
export function formatUnixSecondsRelativeDate(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dayDifference = getCalendarDayNumber(new Date()) - getCalendarDayNumber(date);
  const options =
    dayDifference === 0
      ? RELATIVE_DATE_TIME_FORMAT_OPTIONS
      : dayDifference > 0 && dayDifference < 7
        ? RELATIVE_DATE_WEEKDAY_FORMAT_OPTIONS
        : RELATIVE_DATE_CALENDAR_FORMAT_OPTIONS;

  return date.toLocaleString(dayDifference > 0 && dayDifference < 7 ? "zh-CN" : undefined, options);
}
