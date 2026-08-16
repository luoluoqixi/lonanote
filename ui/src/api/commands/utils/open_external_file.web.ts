export async function openExternalFile(fileUrl: string, mimeType: string): Promise<void> {
  void fileUrl;
  void mimeType;

  throw new Error("在其他应用中打开文件暂不支持桌面端");
}
