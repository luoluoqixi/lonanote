import { describe, expect, it } from "bun:test";

import { createDirectoryPickerModel } from "./directory_picker_model";

describe("directory picker result handoff", () => {
  it("resolves only the matching pending request", async () => {
    const picker = createDirectoryPickerModel(async () => []);
    const result = picker.request({ workspaceId: "workspace-1", purpose: "move" });
    const token = picker.getSnapshot().token;

    expect(picker.accept(token + 1, { directory: "notes" })).toBe(false);
    expect(picker.accept(token, { directory: "notes" })).toBe(true);
    await expect(result).resolves.toEqual({ directory: "notes" });
  });
});
