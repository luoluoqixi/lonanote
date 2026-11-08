import { Asset } from "expo-asset";

/** Web/Tauri 从随包静态资源读取，避免 Metro 动态注册 JS bundle。 */
export async function readLicenseAsset(module: number | string): Promise<string> {
  const asset = Asset.fromModule(module);
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error(`读取许可文本失败：${response.status}`);
  return response.text();
}
