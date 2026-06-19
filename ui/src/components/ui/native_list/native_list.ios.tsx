import { Host, List, Section as SwiftUISection } from "@expo/ui/swift-ui";
import {
  listSectionSpacing,
  listStyle,
  scrollContentBackground,
} from "@expo/ui/swift-ui/modifiers";
import { createContext, useContext } from "react";

// ─── Row components (re-export from fallback) ───
import {
  NativeListActionItem,
  NativeListItem,
  NativeListNavigationItem,
  NativeListSelectItem,
  NativeListSwitchItem,
} from "./native_list_fallback";
import type { NativeListRootProps, NativeListSectionProps } from "./types";

// ─── NativeList 上下文 ──────────────────────────

type NativeListContextValue = {
  native: boolean;
};

const NativeListContext = createContext<NativeListContextValue>({ native: true });

// ─── NativeList Root (iOS) ───────────────────────

/**
 * iOS 原生 `List(insetGrouped)` 容器，作为列表的滚动根容器。
 * 当 `native=false` 时回退到 list_group 模式。
 */
function NativeListRoot({ children, native = true }: NativeListRootProps) {
  if (!native) {
    // 使用 list_group 回退模式
    const { NativeListRoot: FallbackRoot } = require("./native_list_fallback");
    return (
      <NativeListContext.Provider value={{ native: false }}>
        <FallbackRoot>{children}</FallbackRoot>
      </NativeListContext.Provider>
    );
  }

  return (
    <NativeListContext.Provider value={{ native: true }}>
      <Host style={{ flex: 1 }}>
        <List
          modifiers={[
            listStyle("insetGrouped"),
            listSectionSpacing("compact"),
            scrollContentBackground("hidden"),
          ]}
        >
          {children}
        </List>
      </Host>
    </NativeListContext.Provider>
  );
}

// ─── NativeList Section (iOS) ────────────────────

/**
 * iOS 原生 `Section`，内部的 children 通过 SwiftUI 自动渲染为原生行。
 * 当 context native=false 时回退到 list_group Section。
 */
function NativeListSection({ children, footer, title }: NativeListSectionProps) {
  const { native } = useContext(NativeListContext);

  if (!native) {
    // 使用 list_group 回退 Section
    const { NativeListSection: FallbackSection } = require("./native_list_fallback");
    return (
      <FallbackSection footer={footer} title={title}>
        {children}
      </FallbackSection>
    );
  }

  return (
    <SwiftUISection
      footer={typeof footer === "string" ? footer : undefined}
      title={typeof title === "string" ? title : undefined}
    >
      {children}
    </SwiftUISection>
  );
}

// ─── Unified exports matching index.ts expectations ───
export {
  NativeListActionItem,
  NativeListItem,
  NativeListNavigationItem,
  NativeListRoot as NativeList,
  NativeListSection,
  NativeListSelectItem,
  NativeListSwitchItem,
};
