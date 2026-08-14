export type DateGroupDirection = "ascending" | "descending";

export type DateGroupSection<T> = {
  id: string;
  items: T[];
  representativeTimestamp: number | null;
  title: string;
};

function getCalendarDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

function getDateGroup(timestamp: number | null, now: Date): { id: string; title: string } {
  if (timestamp == null) {
    return { id: "unknown", title: "日期未知" };
  }

  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) {
    return { id: "unknown", title: "日期未知" };
  }

  const dayDifference = getCalendarDayNumber(now) - getCalendarDayNumber(date);

  if (dayDifference === 0) {
    return { id: "today", title: "今天" };
  }
  if (dayDifference === 1) {
    return { id: "yesterday", title: "昨天" };
  }
  if (dayDifference >= 2 && dayDifference < 7) {
    return { id: "past-7-days", title: "过去7天" };
  }
  if (dayDifference >= 7 && dayDifference < 30) {
    return { id: "past-30-days", title: "过去30天" };
  }
  if (date.getFullYear() === now.getFullYear()) {
    const month = date.getMonth() + 1;
    return { id: `month-${month}`, title: `${month}月` };
  }

  const year = date.getFullYear();
  return { id: `year-${year}`, title: `${year}年` };
}

/**
 * 将已经排序或未排序的数据按 Unix 秒时间戳分组。
 *
 * 未知日期始终位于末尾；组内顺序保持输入顺序。
 */
export function groupItemsByDate<T>(
  items: T[],
  getTimestamp: (item: T) => number | null,
  direction: DateGroupDirection = "descending",
  now = new Date(),
): DateGroupSection<T>[] {
  const sectionById = new Map<string, DateGroupSection<T>>();

  for (const item of items) {
    const timestamp = getTimestamp(item);
    const group = getDateGroup(timestamp, now);
    const section = sectionById.get(group.id);

    if (section) {
      section.items.push(item);
      if (timestamp != null) {
        const representativeTimestamp = section.representativeTimestamp;
        section.representativeTimestamp =
          representativeTimestamp == null
            ? timestamp
            : direction === "ascending"
              ? Math.min(representativeTimestamp, timestamp)
              : Math.max(representativeTimestamp, timestamp);
      }
    } else {
      sectionById.set(group.id, {
        id: group.id,
        items: [item],
        representativeTimestamp: timestamp,
        title: group.title,
      });
    }
  }

  return [...sectionById.values()].sort((left, right) => {
    if (left.representativeTimestamp == null || right.representativeTimestamp == null) {
      if (left.representativeTimestamp == null && right.representativeTimestamp == null) {
        return 0;
      }

      return left.representativeTimestamp == null ? 1 : -1;
    }

    return direction === "ascending"
      ? left.representativeTimestamp - right.representativeTimestamp
      : right.representativeTimestamp - left.representativeTimestamp;
  });
}
