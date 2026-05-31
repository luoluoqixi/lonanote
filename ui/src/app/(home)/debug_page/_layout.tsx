import { Stack } from "expo-router";

import { getDebugStackHeaderTitle } from "@/components/debug";
import { nativeStackStatusBarOptions } from "@/components/ui";
import { useResolvedeColorScheme } from "@/hooks/settings";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function DebugPageLayout() {
  const colorScheme = useResolvedeColorScheme();

  return (
    <Stack
      screenOptions={({ route }) => {
        const title = getDebugStackHeaderTitle(route.name);
        const showsOwnHeader = route.name !== "index";

        return {
          ...nativeStackStatusBarOptions(colorScheme),
          // 首页 header 交给父级 `(home)` Stack，这样返回按钮由路由栈原生渲染；
          // 这里仅为 `debug_page/*` 子页面保留本级 header。
          headerShown: title != null && showsOwnHeader,
          title: title ?? "调试",
        };
      }}
    />
  );
}
