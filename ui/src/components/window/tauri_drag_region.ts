import { isDesktop } from "@/api/common/platform";

const tauriDragRegionProps: Record<string, unknown> = isDesktop()
  ? {
      dataSet: {
        tauriDragRegion: "",
      },
    }
  : {};

export { tauriDragRegionProps };
