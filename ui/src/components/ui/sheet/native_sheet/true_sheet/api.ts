import { TrueSheet } from "@lodev09/react-native-true-sheet";

/** 展示已挂载的 True Sheet（`name` 须与对应 `<TrueSheet name={...} />` 一致）。 */
export function presentTrueSheet(name: string, detentIndex = 0) {
  return TrueSheet.present(name, detentIndex);
}

/** 关闭指定名称的 True Sheet。 */
export function dismissTrueSheet(name: string) {
  return TrueSheet.dismiss(name);
}

/** 将已展示的 True Sheet 切换到指定 detent 档位。 */
export function resizeTrueSheet(name: string, detentIndex: number) {
  return TrueSheet.resize(name, detentIndex);
}
