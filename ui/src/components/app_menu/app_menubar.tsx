import { useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { Menubar, Text, useUiTheme } from "rn-ui-kit";

import { isWeb } from "@/api/common/platform";

import { useAppMenuContext } from "./app_menu_host";
import type { AppMenuNode } from "./app_menu_model";
import { useAppMenuKeyboard } from "./use_app_menu_keyboard";

export function AppMenubar({ compact }: { compact: boolean }) {
  const { groups, execute, refresh, captureEditTarget } = useAppMenuContext();
  const theme = useUiTheme();
  const { height } = useWindowDimensions();
  const [value, setValue] = useState("");
  const handingOffFocus = useRef(false);
  const maxHeight = Math.max(160, height - 72);
  const capture = () => {
    if (!value) captureEditTarget();
  };
  const keyboard = useAppMenuKeyboard({ compact, capture, close: () => setValue("") });
  const renderItems = (nodes: AppMenuNode[], prefix: string) =>
    nodes.map((node, index) => {
      const key = `${prefix}-${index}`;
      if (node.type === "separator") return <Menubar.Separator key={key} />;
      if (node.type === "submenu")
        return (
          <Menubar.Sub key={key}>
            <Menubar.SubTrigger>
              <Text>{node.title}</Text>
            </Menubar.SubTrigger>
            <Menubar.SubContent style={{ backgroundColor: theme.background, maxHeight }}>
              <ScrollView
                nestedScrollEnabled
                style={{ maxHeight }}
                keyboardShouldPersistTaps="handled"
              >
                {renderItems(node.items, key)}
              </ScrollView>
            </Menubar.SubContent>
          </Menubar.Sub>
        );
      return (
        <Menubar.Item
          key={node.action}
          disabled={!node.enabled}
          onPress={() => {
            handingOffFocus.current = true;
            setValue("");
            // 先释放菜单的焦点层，再打开 Dialog / 文件选择器。
            setTimeout(() => {
              void execute(node.action);
            }, 0);
          }}
        >
          <Text>{node.title}</Text>
          {node.shortcut ? <Menubar.Shortcut>{node.shortcut}</Menubar.Shortcut> : null}
        </Menubar.Item>
      );
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
          if (next) keyboard.onMenuOpen();
          setValue(next ?? "");
          if (next) handingOffFocus.current = false;
          if (next) void refresh().catch(() => undefined);
        }}
        size="sm"
        contentSize="sm"
        className="rounded-none border-0 shadow-none"
        style={{
          height: "100%",
          borderWidth: 0,
          borderRadius: 0,
          backgroundColor: "transparent",
          padding: 0,
          gap: 0,
        }}
      >
        {visible.map((group) => (
          <Menubar.Menu key={group.id} value={group.id}>
            <Menubar.Trigger
              {...(isWeb() ? { dataSet: { appMenuTrigger: group.id } } : {})}
              style={{
                paddingLeft: 6,
                paddingRight: 6,
                ...(keyboard.showHints && keyboard.focusedId === group.id
                  ? {
                      backgroundColor: theme.accent,
                      outlineStyle: "solid",
                      outlineWidth: 1,
                      outlineColor: theme.primary,
                    }
                  : {}),
              }}
            >
              <Text className="group-focus-visible:text-accent-foreground">
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
            </Menubar.Trigger>
            <Menubar.Content
              sideOffset={0}
              onCloseAutoFocus={(event) => {
                if (handingOffFocus.current || keyboard.restoreFocusOnClose())
                  event.preventDefault();
              }}
              style={{ backgroundColor: theme.background, maxHeight }}
            >
              {renderItems(group.items, group.id)}
            </Menubar.Content>
          </Menubar.Menu>
        ))}
      </Menubar>
    </View>
  );
}
