import { describe, expect, it } from "bun:test";

import {
  applySnapshot,
  beginMutation,
  createConfigSyncState,
  rejectMutation,
  resolveMutation,
} from "./config_sync_state";

const snapshot = (runtimeId, revision, values) => ({ runtimeId, revision, values });

describe("config sync state", () => {
  it("accepts newer revisions only within the same runtime", () => {
    const initial = createConfigSyncState(
      snapshot("runtime-a", 2, {
        theme: "light",
        sort: "name",
        autoSave: true,
      }),
    );
    const newer = applySnapshot(
      initial,
      snapshot("runtime-a", 3, {
        theme: "dark",
        sort: "name",
        autoSave: true,
      }),
    );

    expect(newer.committed?.revision).toBe(3);
    expect(
      applySnapshot(
        newer,
        snapshot("runtime-b", 0, {
          theme: "light",
          sort: "date",
          autoSave: false,
        }),
      ).committed?.runtimeId,
    ).toBe("runtime-b");
  });

  it("ignores duplicate and stale snapshots", () => {
    const initial = createConfigSyncState(
      snapshot("runtime-a", 4, {
        theme: "dark",
        sort: "name",
        autoSave: true,
      }),
    );

    expect(
      applySnapshot(
        initial,
        snapshot("runtime-a", 4, {
          theme: "light",
          sort: "date",
          autoSave: false,
        }),
      ),
    ).toEqual(initial);
    expect(
      applySnapshot(
        initial,
        snapshot("runtime-a", 3, {
          theme: "light",
          sort: "date",
          autoSave: false,
        }),
      ),
    ).toEqual(initial);
  });

  it("preserves local pending patches over remote snapshots", () => {
    const initial = createConfigSyncState(
      snapshot("runtime-a", 1, {
        theme: "light",
        sort: "name",
        autoSave: true,
      }),
    );
    const pending = beginMutation(initial, "theme-change", {
      set: { theme: "dark" },
    });
    const remote = applySnapshot(
      pending,
      snapshot("runtime-a", 2, {
        theme: "light",
        sort: "date",
        autoSave: false,
      }),
    );

    expect(remote.values).toEqual({ theme: "dark", sort: "date", autoSave: false });
  });

  it("failed mutation removes only its own pending patch", () => {
    const initial = createConfigSyncState(
      snapshot("runtime-a", 1, {
        theme: "light",
        sort: "name",
        autoSave: true,
      }),
    );
    const withTwo = beginMutation(
      beginMutation(initial, "theme-change", { set: { theme: "dark" } }),
      "sort-change",
      { set: { sort: "date" } },
    );

    const afterFailure = rejectMutation(withTwo, "theme-change");
    expect(afterFailure.values).toEqual({ theme: "light", sort: "date", autoSave: true });
    expect(afterFailure.pending.map((mutation) => mutation.mutationId)).toEqual(["sort-change"]);
  });

  it("converges when response and event arrive in either order", () => {
    const initial = createConfigSyncState(
      snapshot("runtime-a", 1, {
        theme: "light",
        sort: "name",
        autoSave: true,
      }),
    );
    const patch = { set: { theme: "dark" } };
    const pending = beginMutation(initial, "theme-change", patch);
    const committed = snapshot("runtime-a", 2, {
      theme: "dark",
      sort: "name",
      autoSave: true,
    });

    const responseFirst = applySnapshot(
      resolveMutation(pending, "theme-change", committed),
      committed,
    );
    const eventFirst = resolveMutation(
      applySnapshot(pending, committed),
      "theme-change",
      committed,
    );

    expect(responseFirst).toEqual(eventFirst);
    expect(responseFirst.values).toEqual(committed.values);
    expect(responseFirst.pending).toHaveLength(0);
  });
});
