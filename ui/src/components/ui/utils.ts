import type { DimensionValue } from "react-native";

export function resolvePercentageValue(
  value: DimensionValue | undefined,
  availableSize: number,
): DimensionValue | undefined {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.endsWith("%")) {
    return value;
  }

  const parsedPercentage = Number.parseFloat(trimmedValue.slice(0, -1));

  if (!Number.isFinite(parsedPercentage)) {
    return value;
  }

  return (availableSize * parsedPercentage) / 100;
}
