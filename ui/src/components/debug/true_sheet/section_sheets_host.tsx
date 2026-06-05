import { useCallback } from "react";

import { TrueSheetPanel } from "@/components/ui/true_sheet/panel";

import {
  DEBUG_PANEL_ROUTE_DEFINITIONS,
  type DebugTabKey,
  getDebugPanelRouteDefinition,
} from "../routes";
import { DebugSectionScreen } from "../screens";
import {
  DEBUG_NESTED_SECTION_SHEET_DETENTS,
  cleanupDebugSectionSheet,
  closeDebugSectionSheet,
  getDebugSectionOverlayPortalHost,
  getDebugSectionSheetName,
} from "./api";
import { DebugTrueSheetScroll } from "./shared_scroll";

function DebugSectionTrueSheet({ sectionKey }: { sectionKey: DebugTabKey }) {
  const definition = getDebugPanelRouteDefinition(sectionKey);

  const handleClose = useCallback(() => {
    void closeDebugSectionSheet(sectionKey);
  }, [sectionKey]);

  const handleDidDismiss = useCallback(() => {
    // 拖拽关闭时 onRequestClose 不会触发，需在此同步清理追踪集合
    cleanupDebugSectionSheet(sectionKey);
  }, [sectionKey]);

  return (
    <TrueSheetPanel
      chrome="toolbar"
      name={getDebugSectionSheetName(sectionKey)}
      onDidDismiss={handleDidDismiss}
      onRequestClose={handleClose}
      overlayPortalHostName={getDebugSectionOverlayPortalHost(sectionKey)}
      sheetProps={{
        detents: [...DEBUG_NESTED_SECTION_SHEET_DETENTS],
      }}
      title={definition.label}
    >
      <DebugTrueSheetScroll>
        <DebugSectionScreen layoutHost="trueSheet" sectionKey={sectionKey} />
      </DebugTrueSheetScroll>
    </TrueSheetPanel>
  );
}

/** 三个调试分区各自的具名 True Sheet（可叠在主页 Sheet 之上）。 */
export function DebugSectionTrueSheetsHost() {
  return (
    <>
      {DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => (
        <DebugSectionTrueSheet key={definition.key} sectionKey={definition.key} />
      ))}
    </>
  );
}
