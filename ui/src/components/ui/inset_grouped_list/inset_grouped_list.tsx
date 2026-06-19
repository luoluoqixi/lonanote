import {
  FallbackInsetGroupedList,
  FallbackInsetGroupedListActionItem,
  FallbackInsetGroupedListItem,
  FallbackInsetGroupedListNavigationItem,
  FallbackInsetGroupedListSection,
  FallbackInsetGroupedListSelectItem,
  FallbackInsetGroupedListSwitchItem,
} from "./fallback";

export const InsetGroupedList = Object.assign(FallbackInsetGroupedList, {
  ActionItem: FallbackInsetGroupedListActionItem,
  Item: FallbackInsetGroupedListItem,
  NavigationItem: FallbackInsetGroupedListNavigationItem,
  Section: FallbackInsetGroupedListSection,
  SelectItem: FallbackInsetGroupedListSelectItem,
  SwitchItem: FallbackInsetGroupedListSwitchItem,
});
