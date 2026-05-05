import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { app } from "@/api";
import { PathDebugPanel } from "@/components/debug";
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
    <>
      <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 px-6 py-10">
        <View className="gap-4">
          <Button variant="primary" onPress={handleCallRust}>
            Call Rust
          </Button>
          <Button variant="outline" onPress={() => setIsDialogOpen(true)}>
            Open Dialog
          </Button>
          <Text className="text-foreground">Rust version result: {result || "未调用"}</Text>
        </View>

        <PathDebugPanel />
      </ScrollView>

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
    </>
  );
}
