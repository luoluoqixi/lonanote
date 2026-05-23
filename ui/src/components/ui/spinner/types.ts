export type SpinnerColor = "primary" | "secondary" | "success" | "warning" | "danger";
export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  className?: string;
  size?: SpinnerSize;
}
