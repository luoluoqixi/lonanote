import { Button } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { app } from "@/api";

export default function HomeScreen() {
  const [result, setResult] = useState("");
  return (
    <View className="flex-1 justify-center items-center bg-background">
      <Button
        variant="primary"
        onPress={async () => {
          const result = await app.getVersion();
          console.log("rust add result", result);
          setResult(result);
        }}
      >
        Call Rust
      </Button>
      <Text>Rust add result: {result}</Text>
    </View>
  );
}
