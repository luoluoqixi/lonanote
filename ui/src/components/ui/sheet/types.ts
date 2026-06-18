import type { ComponentProps, ReactNode } from "react";

import type { TrueSheetScrollContentProps } from "@/components/ui/true_sheet/scroll_content";

import type * as ReplicaSheetModule from "./sheet/Sheet";
import type * as ReplicaSheetControllerModule from "./sheet/SheetController";

export interface SheetProps extends Omit<
  ComponentProps<typeof ReplicaSheetModule.Sheet>,
  "native"
> {
  content?: ReactNode;
  dismissOnBackPress?: boolean;
  frameProps?: SheetFrameProps;
  handle?: boolean;
  handleProps?: SheetHandleProps;
  /** 仅 Android / iOS 生效。
   * iOS 默认 true，Android 默认 false。开启后由 TrueSheet 接管渲染。 */
  native?: boolean;
  overlay?: boolean;
  overlayProps?: SheetOverlayProps;
  scrollView?: boolean;
  scrollViewProps?: SheetScrollViewProps;
}

export type SheetControlledProps = ComponentProps<typeof ReplicaSheetModule.Sheet.Controlled>;
export type SheetControllerProps = ComponentProps<
  typeof ReplicaSheetControllerModule.SheetController
>;
export type SheetFrameProps = ComponentProps<typeof ReplicaSheetModule.Sheet.Frame>;
export type SheetOverlayProps = ComponentProps<typeof ReplicaSheetModule.Sheet.Overlay>;
export type SheetHandleProps = ComponentProps<typeof ReplicaSheetModule.Sheet.Handle>;
export type SheetScrollViewProps = ComponentProps<typeof ReplicaSheetModule.Sheet.ScrollView> &
  Pick<TrueSheetScrollContentProps, "extraBottomPadding">;
