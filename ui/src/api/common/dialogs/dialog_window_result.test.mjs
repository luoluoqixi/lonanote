import { describe, expect, it } from "bun:test";

import { isDialogWindowRendererFailure } from "./dialog_types";

describe("dialog renderer failure result", () => {
  it("recognizes the renderer failure marker without treating other results as failures", () => {
    expect(isDialogWindowRendererFailure({ __dialogRendererFailure: true })).toBe(true);
    expect(isDialogWindowRendererFailure({ action: "cancel" })).toBe(false);
    expect(isDialogWindowRendererFailure(null)).toBe(false);
  });
});
