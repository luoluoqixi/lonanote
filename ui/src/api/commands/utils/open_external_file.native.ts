import * as Sharing from "expo-sharing";

export async function openExternalFile(fileUrl: string, mimeType: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("当前设备不支持在其他应用中打开文件");
  }

  await Sharing.shareAsync(fileUrl, {
    dialogTitle: "在其他应用中打开",
    mimeType,
  });
}
