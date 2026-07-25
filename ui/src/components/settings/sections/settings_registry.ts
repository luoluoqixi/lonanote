export type SettingsTabKey = "appearance" | "global" | "window";

export const settingsTabs: Array<{ key: SettingsTabKey; label: string }> = [
  { key: "global", label: "全局设置" },
  { key: "appearance", label: "外观" },
  { key: "window", label: "窗口" },
];
