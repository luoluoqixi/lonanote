import { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Menubar, type MenubarItemData, Text, useUiTheme } from "rn-ui-kit";

import { isWeb } from "@/api/common/platform";

import { DESKTOP_MENUBAR_SIZE } from "../common/consts";
import { useAppMenuContext } from "./app_menu_host";
import type { AppMenuNode } from "./app_menu_model";
import { useAppMenuKeyboard } from "./use_app_menu_keyboard";

export function AppMenubar({ compact }: { compact: boolean }) {
  const { groups, execute, refresh, captureEditTarget } = useAppMenuContext();
  const theme = useUiTheme();
  const { height } = useWindowDimensions();
  const [value, setValue] = useState<string>();
  const capture = () => {
    if (!value) captureEditTarget();
  };
  const keyboard = useAppMenuKeyboard({ compact, capture, close: () => setValue(undefined) });
  const menuItems = (nodes: AppMenuNode[], prefix: string): MenubarItemData[] =>
    nodes.map((node, index) => {
      const key = `${prefix}-${index}`;
      if (node.type === "separator") return { value: key, separator: true };
      if (node.type === "submenu")
        return { value: key, label: node.title, subMenu: menuItems(node.items, key) };
      return {
        value: node.action,
        label: node.title,
        shortcut: node.shortcut,
        disabled: !node.enabled,
        onPress: () => {
          setValue(undefined);
          // 等待菜单释放焦点后再打开 Dialog 或文件选择器。
          requestAnimationFrame(() => void execute(node.action));
        },
      };
    });
  const visible = compact
    ? [
        {
          id: "overflow",
          title: "菜单",
          items: groups.map(
            (group): AppMenuNode => ({ type: "submenu", title: group.title, items: group.items }),
          ),
        },
      ]
    : groups;
  return (
    <View
      {...(isWeb()
        ? ({ dataSet: { appMenubar: "true" }, onPointerDownCapture: capture } as object)
        : {})}
      onTouchStart={capture}
      style={{ minWidth: 64, maxWidth: 360, flexShrink: 1, height: "100%" }}
    >
      <Menubar
        value={value}
        onValueChange={(next) => {
          setValue(next);
          if (next) {
            keyboard.onMenuOpen();
            void refresh().catch(() => undefined);
          } else requestAnimationFrame(() => keyboard.restoreFocusOnClose());
        }}
        size={DESKTOP_MENUBAR_SIZE}
        contentProps={{ sideOffset: 0, maxHeight: Math.max(160, height - 72) }}
        className="rounded-none border-0 shadow-none"
        style={{
          height: "100%",
          marginTop: 1,
          borderWidth: 0,
          borderRadius: 0,
          backgroundColor: "transparent",
          padding: 0,
          gap: 0,
        }}
        items={visible.map((group) => ({
          value: group.id,
          title: (
            <Text>
              {group.title}
              {keyboard.mnemonics[group.id] ? (
                <Text>
                  (
                  <Text style={{ textDecorationLine: keyboard.showHints ? "underline" : "none" }}>
                    {keyboard.mnemonics[group.id]}
                  </Text>
                  )
                </Text>
              ) : null}
            </Text>
          ),
          items: menuItems(group.items, group.id),
          triggerProps: {
            style: {
              paddingLeft: 6,
              paddingRight: 6,
              ...(keyboard.showHints && keyboard.focusedId === group.id
                ? {
                    backgroundColor: theme.accent03,
                    outlineStyle: "solid",
                    outlineWidth: 1,
                    outlineColor: theme.accent,
                  }
                : {}),
            },
            herouiWebProps: {
              render: (props) => <button {...props} data-app-menu-trigger={group.id} />,
            },
          },
        }))}
      />
    </View>
  );
}
