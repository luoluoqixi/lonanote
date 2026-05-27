import type { ComponentProps, ReactNode } from "react";

import type * as ReplicaSheetModule from "./sheet/Sheet";
import type * as ReplicaSheetControllerModule from "./sheet/SheetController";

export interface SheetProps extends ComponentProps<typeof ReplicaSheetModule.Sheet> {
  content?: ReactNode;
  dismissOnBackPress?: boolean;
  frameProps?: SheetFrameProps;
  handle?: boolean;
  handleProps?: SheetHandleProps;
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
export type SheetScrollViewProps = ComponentProps<typeof ReplicaSheetModule.Sheet.ScrollView>;
