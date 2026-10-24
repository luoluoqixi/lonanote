import type { DropdownItemData } from "rn-ui-kit";

type WorkspaceSelectSettingsMenuItemsOptions = {
  embedded: boolean;
  settingsItem: DropdownItemData;
};

export function getWorkspaceSelectSettingsMenuItems({
  embedded,
  settingsItem,
}: WorkspaceSelectSettingsMenuItemsOptions): DropdownItemData[] {
  if (embedded) {
    return [];
  }

  return [
    {
      separator: true,
      value: "separator-02",
    },
    settingsItem,
  ];
}
