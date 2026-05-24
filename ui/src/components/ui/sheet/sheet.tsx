import { SheetController as TamaguiSheetController } from "@tamagui/sheet/controller";
import { Sheet as TamaguiSheet } from "tamagui";

import type {
  SheetControlledProps,
  SheetControllerProps,
  SheetFrameProps,
  SheetHandleProps,
  SheetOverlayProps,
  SheetProps,
  SheetScrollViewProps,
} from "./types";

const DEFAULT_OVERLAY_ENTER_STYLE = { opacity: 0 } as const;
const DEFAULT_OVERLAY_EXIT_STYLE = { opacity: 0 } as const;

function SheetRoot(props: SheetProps) {
  const {
    children,
    containerComponent: ContainerComponent,
    content,
    frameProps,
    handle,
    handleProps,
    modal,
    overlay,
    overlayProps,
    scrollView,
    scrollViewProps,
    ...rootProps
  } = props;
  const hasDefaultStructure =
    overlay != null || handle != null || content != null || scrollView != null;

  const resolvedRootProps = {
    ...rootProps,
    ...(modal != null ? { modal } : null),
    ...(modal || ContainerComponent == null ? { containerComponent: ContainerComponent } : null),
  };

  const sheet = !hasDefaultStructure ? (
    <TamaguiSheet {...resolvedRootProps}>{children}</TamaguiSheet>
  ) : (
    <TamaguiSheet {...resolvedRootProps}>
      {overlay ? <SheetOverlay {...overlayProps} /> : null}
      {handle ? <SheetHandle {...handleProps} /> : null}
      <SheetFrame {...frameProps}>
        {scrollView ? <SheetScrollView {...scrollViewProps}>{content}</SheetScrollView> : content}
      </SheetFrame>
      {children}
    </TamaguiSheet>
  );

  if (ContainerComponent != null && modal !== true) {
    return <ContainerComponent>{sheet}</ContainerComponent>;
  }

  return sheet;
}

function SheetControlled(props: SheetControlledProps) {
  return <TamaguiSheet.Controlled {...props} />;
}

function SheetController(props: SheetControllerProps) {
  return <TamaguiSheetController {...props} />;
}

function SheetFrame(props: SheetFrameProps) {
  return <TamaguiSheet.Frame {...props} />;
}

function SheetOverlay(props: SheetOverlayProps) {
  return (
    <TamaguiSheet.Overlay
      {...props}
      bg={props.bg ?? "$shadowColor"}
      enterStyle={props.enterStyle ?? DEFAULT_OVERLAY_ENTER_STYLE}
      exitStyle={props.exitStyle ?? DEFAULT_OVERLAY_EXIT_STYLE}
      opacity={props.opacity ?? 0.5}
      transition={props.transition ?? "lazy"}
    />
  );
}

function SheetHandle(props: SheetHandleProps) {
  return <TamaguiSheet.Handle {...props} />;
}

function SheetScrollView(props: SheetScrollViewProps) {
  return <TamaguiSheet.ScrollView {...props} />;
}

export const Sheet = Object.assign(SheetRoot, {
  Controlled: SheetControlled,
  Controller: SheetController,
  Frame: SheetFrame,
  Overlay: SheetOverlay,
  Handle: SheetHandle,
  ScrollView: SheetScrollView,
});
