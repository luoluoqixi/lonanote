import { Button } from "heroui-native";
import { LonanoteRustModule } from "lonanote_rust_module";
import { useState } from "react";
import { Text, View } from "react-native";

export default function HomeScreen() {
  const [result, setResult] = useState(0);
  return (
    <View className="flex-1 justify-center items-center bg-background">
      <Button
        variant="primary"
        onPress={() => {
          const result = LonanoteRustModule.add(1, 2);
          console.log("rust add result", result);
          setResult(result);
        }}
      >
        Call Rust Module
      </Button>
      <Text>Rust add result: {result}</Text>
    </View>
  );
}
