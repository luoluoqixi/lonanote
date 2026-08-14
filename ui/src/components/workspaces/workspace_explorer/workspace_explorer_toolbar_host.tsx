import { useIsFocused } from "@react-navigation/native";
import { usePathname } from "expo-router";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";

import { useUiPreferences } from "@/hooks/settings";

import {
  WorkspaceExplorerToolbar,
  type WorkspaceExplorerToolbarProps,
} from "./workspace_explorer_toolbar";

type WorkspaceExplorerToolbarContextValue = {
  updateToolbar: (props: WorkspaceExplorerToolbarProps) => void;
};

const WorkspaceExplorerToolbarContext = createContext<WorkspaceExplorerToolbarContextValue | null>(
  null,
);

export function WorkspaceExplorerToolbarHost({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { preferences } = useUiPreferences();
  const [toolbarProps, setToolbarProps] = useState<WorkspaceExplorerToolbarProps | null>(null);
  const updateToolbar = useCallback((props: WorkspaceExplorerToolbarProps) => {
    setToolbarProps(props);
  }, []);
  const contextValue = useMemo(
    () => ({
      updateToolbar,
    }),
    [updateToolbar],
  );

  return (
    <WorkspaceExplorerToolbarContext.Provider value={contextValue}>
      <View style={styles.container}>
        {children}
        {pathname === "/workspace" &&
        preferences.workspaceExplorer.showFloatingToolbar &&
        toolbarProps ? (
          <WorkspaceExplorerToolbar {...toolbarProps} />
        ) : null}
      </View>
    </WorkspaceExplorerToolbarContext.Provider>
  );
}

export function useWorkspaceExplorerToolbar(props: WorkspaceExplorerToolbarProps) {
  const context = useContext(WorkspaceExplorerToolbarContext);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      context?.updateToolbar(props);
    }
  }, [context, isFocused, props]);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
