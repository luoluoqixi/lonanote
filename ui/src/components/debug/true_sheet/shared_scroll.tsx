import { ScrollView, StyleSheet } from "react-native";

export function DebugTrueSheetScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator
      style={styles.scroll}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
