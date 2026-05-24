import { Children, type ReactNode, isValidElement } from "react";
import type { DimensionValue } from "react-native";

export function resolveAriaLabel(
  explicitLabel?: string,
  fallbackNode?: ReactNode,
): string | undefined {
  if (explicitLabel != null && explicitLabel.trim().length > 0) {
    return explicitLabel;
  }

  const derivedLabel = Children.toArray(fallbackNode)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return resolveAriaLabel(undefined, child.props.children) ?? "";
      }

      return "";
    })
    .join("")
    .trim();

  return derivedLabel.length > 0 ? derivedLabel : undefined;
}

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
