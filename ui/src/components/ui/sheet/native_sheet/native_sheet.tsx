import { SimpleSheet } from "../simple_sheet";
import type { NativeSheetProps } from "./types";

function NativeSheetRoot(props: NativeSheetProps) {
  return <SimpleSheet {...(props as any)} native={props.native ?? true} />;
}

export const NativeSheet = Object.assign(NativeSheetRoot, {
  Controlled: SimpleSheet.Controlled,
  Controller: SimpleSheet.Controller,
  Frame: SimpleSheet.Frame,
  Handle: SimpleSheet.Handle,
  Overlay: SimpleSheet.Overlay,
  ScrollView: SimpleSheet.ScrollView,
});
