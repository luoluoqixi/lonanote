import type { SheetController as TamaguiSheetController } from "@tamagui/sheet/controller";
import type { ComponentProps, ReactNode } from "react";
import type { Sheet as TamaguiSheet } from "tamagui";

export interface SheetProps extends ComponentProps<typeof TamaguiSheet> {
  content?: ReactNode;
  frameProps?: SheetFrameProps;
  handle?: boolean;
  handleProps?: SheetHandleProps;
  overlay?: boolean;
  overlayProps?: SheetOverlayProps;
  scrollView?: boolean;
  scrollViewProps?: SheetScrollViewProps;
}

export type SheetControlledProps = ComponentProps<typeof TamaguiSheet.Controlled>;
export type SheetControllerProps = ComponentProps<typeof TamaguiSheetController>;
export type SheetFrameProps = ComponentProps<typeof TamaguiSheet.Frame>;
export type SheetOverlayProps = ComponentProps<typeof TamaguiSheet.Overlay>;
export type SheetHandleProps = ComponentProps<typeof TamaguiSheet.Handle>;
export type SheetScrollViewProps = ComponentProps<typeof TamaguiSheet.ScrollView>;
