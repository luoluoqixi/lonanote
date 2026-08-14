export type NameSortDirection = "ascending" | "descending";

const NAME_GROUP = {
  symbol: 0,
  number: 1,
  other: 2,
  latin: 3,
} as const;

const naturalNameCollator = new Intl.Collator("zh-Hans-CN", {
  numeric: true,
  sensitivity: "base",
});

function getNameGroup(name: string): number {
  if (/^\p{Number}/u.test(name)) {
    return NAME_GROUP.number;
  }

  if (/^\p{Script=Latin}/u.test(name)) {
    return NAME_GROUP.latin;
  }

  if (/^\p{Letter}/u.test(name)) {
    return NAME_GROUP.other;
  }

  return NAME_GROUP.symbol;
}

function normalizeNameForPrefixComparison(name: string): string {
  return name.normalize("NFKC").toLocaleLowerCase("zh-Hans-CN");
}

function compareNamePrefixes(leftName: string, rightName: string): number {
  const normalizedLeftName = normalizeNameForPrefixComparison(leftName);
  const normalizedRightName = normalizeNameForPrefixComparison(rightName);

  if (normalizedLeftName === normalizedRightName) {
    return 0;
  }
  if (normalizedRightName.startsWith(normalizedLeftName)) {
    return -1;
  }
  if (normalizedLeftName.startsWith(normalizedRightName)) {
    return 1;
  }

  return 0;
}

/**
 * 比较面向用户显示的名称。
 *
 * 分类优先级固定为符号、数字、中文及其他非 Latin 文字、Latin；倒序只反转分类内部顺序。
 * 当一个名称是另一个名称的完整前缀时，正序优先显示较短名称。
 */
export function compareNames(
  leftName: string,
  rightName: string,
  direction: NameSortDirection = "ascending",
): number {
  const groupComparison = getNameGroup(leftName) - getNameGroup(rightName);
  if (groupComparison !== 0) {
    return groupComparison;
  }

  const prefixComparison = compareNamePrefixes(leftName, rightName);
  const naturalComparison = prefixComparison || naturalNameCollator.compare(leftName, rightName);
  const deterministicComparison =
    naturalComparison || (leftName === rightName ? 0 : leftName < rightName ? -1 : 1);

  return direction === "descending" ? -deterministicComparison : deterministicComparison;
}
