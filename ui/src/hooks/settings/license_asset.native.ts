import { Asset } from "expo-asset";
import { File } from "expo-file-system";

/** Android/iOS 使用随包 asset 的本地缓存，离线安装包无需联网。 */
export async function readLicenseAsset(module: number | string): Promise<string> {
  const asset = await Asset.fromModule(module).downloadAsync();
  if (!asset.localUri) throw new Error("许可文本未生成本地缓存");
  return new File(asset.localUri).text();
}
