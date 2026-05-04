import { useState } from "react";
import { Text, View } from "react-native";

import { app } from "@/api";
import { Button, Dialog } from "@/components/ui";

export default function HomeScreen() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [result, setResult] = useState("");

  async function handleCallRust() {
    const nextResult = await app.getVersion();
    console.log("rust add result", nextResult);
    setResult(nextResult);
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Button variant="primary" onPress={handleCallRust}>
        Call Rust
      </Button>
      <Button variant="outline" onPress={() => setIsDialogOpen(true)}>
        Open Dialog
      </Button>
      <Text className="text-foreground">Rust version result: {result || "未调用"}</Text>

      <Dialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="跨平台 Dialog 示例"
        description="web 端走 rn-primitives，native 端走 heroui-native。"
        actions={
          <>
            <Button variant="ghost" onPress={() => setIsDialogOpen(false)}>
              关闭
            </Button>
            <Button
              onPress={async () => {
                await handleCallRust();
                setIsDialogOpen(false);
              }}
            >
              调用 Rust 后关闭
            </Button>
          </>
        }
      >
        <Text className="text-foreground/80">
          业务层只使用统一的 Dialog 包装层，不直接依赖具体第三方实现。
        </Text>
      </Dialog>
    </View>
  );
}
