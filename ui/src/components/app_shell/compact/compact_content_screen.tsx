import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ScrollView, Text } from "rn-ui-kit";

type CompactContentScreenProps = {
  children?: ReactNode;
  description: string;
  title: string;
};

export function CompactContentScreen({ children, description, title }: CompactContentScreenProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scrollView}
    >
      <View style={styles.header}>
        <Text fontSize="$8" fontWeight="600" selectable>
          {title}
        </Text>
        <Text color="$color10" fontSize="$4" lineHeight="$5" selectable>
          {description}
        </Text>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 20,
  },
  header: {
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
});
