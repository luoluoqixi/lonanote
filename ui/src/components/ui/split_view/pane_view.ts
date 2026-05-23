import { LayoutService } from "./layout_service";
import { SplitLayoutPriority } from "./types";

interface LayoutStrategy {
  getPreferredSize: () => number | undefined;
}

class PixelLayout implements LayoutStrategy {
  constructor(private size: number) {}

  getPreferredSize() {
    return this.size;
  }
}

class ProportionLayout implements LayoutStrategy {
  constructor(
    private proportion: number,
    private layoutService: LayoutService,
  ) {}

  getPreferredSize() {
    return this.proportion * this.layoutService.getSize();
  }
}

class NullLayout implements LayoutStrategy {
  getPreferredSize() {
    return undefined;
  }
}

export type PaneViewOptions = {
  maximumSize?: number;
  minimumSize?: number;
  preferredSize?: number | string;
  priority?: SplitLayoutPriority;
  snap?: boolean;
};

export class PaneView {
  maximumSize = Number.POSITIVE_INFINITY;
  minimumSize = 0;
  priority: SplitLayoutPriority;
  snap: boolean;
  private layoutStrategy: LayoutStrategy;

  get preferredSize() {
    return this.layoutStrategy.getPreferredSize();
  }

  set preferredSize(preferredSize: number | string | undefined) {
    this.layoutStrategy = createLayoutStrategy(preferredSize, this.layoutService);
  }

  constructor(
    private layoutService: LayoutService,
    options: PaneViewOptions,
  ) {
    this.minimumSize = typeof options.minimumSize === "number" ? options.minimumSize : 30;
    this.maximumSize =
      typeof options.maximumSize === "number" ? options.maximumSize : Number.POSITIVE_INFINITY;
    this.priority = options.priority ?? SplitLayoutPriority.Normal;
    this.snap = typeof options.snap === "boolean" ? options.snap : false;
    this.layoutStrategy = createLayoutStrategy(options.preferredSize, layoutService);
  }
}

function createLayoutStrategy(
  preferredSize: number | string | undefined,
  layoutService: LayoutService,
): LayoutStrategy {
  if (typeof preferredSize === "number") return new PixelLayout(preferredSize);

  if (typeof preferredSize === "string") {
    const value = preferredSize.trim();
    if (value.endsWith("%")) {
      const proportion = Number(value.slice(0, -1)) / 100;
      return Number.isFinite(proportion)
        ? new ProportionLayout(proportion, layoutService)
        : new NullLayout();
    }

    if (value.endsWith("px")) {
      const pixels = Number(value.slice(0, -2));
      return Number.isFinite(pixels) ? new PixelLayout(pixels) : new NullLayout();
    }

    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? new PixelLayout(number) : new NullLayout();
  }

  return new NullLayout();
}
