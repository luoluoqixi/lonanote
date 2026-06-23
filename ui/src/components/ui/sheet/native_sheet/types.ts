import type { TrueSheetProps } from "@lodev09/react-native-true-sheet";
import type { ParamListBase } from "@react-navigation/native";
import type { ComponentType, ReactNode } from "react";

import type { SheetProps as SimpleSheetProps } from "../simple_sheet/types";
import type { TrueSheetInnerStackScreenOptions } from "./true_sheet/stack_navigator";

export interface NativeSheetProps extends SimpleSheetProps {
  name?: string;
  overlayPortalHostName?: string;
}

export type NativeSheetStackScreenProps = {
  component: ComponentType<any>;
  name: string;
  options?: Record<string, unknown>;
};

export interface NativeSheetStackProps<ParamList extends ParamListBase = ParamListBase> {
  children: ReactNode;
  initialRouteName?: keyof ParamList & string;
  name?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  overlayPortalHostName?: string;
  screenOptions?: TrueSheetInnerStackScreenOptions;
  sheetProps?: Omit<TrueSheetProps, "children" | "header" | "name"> & {
    snapPoints?: SimpleSheetProps["snapPoints"];
    snapPointsMode?: SimpleSheetProps["snapPointsMode"];
  };
}
