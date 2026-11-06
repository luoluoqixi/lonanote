import { describe, expect, it } from "bun:test";

import { createCommonStoreSync } from "@/api/common/common_store_sync";

function makeHarness(initial = { theme: "light", sort: "name" }, patchRemoteOverride = null) {
  let values = { ...initial };
  const persisted = [];
  const calls = [];
  const cache = {
    all: () => ({ ...values }),
    replace: (next) => {
      values = { ...next };
    },
    set: (key, value) => {
      values[key] = value;
    },
    delete: (key) => {
      const existed = Object.prototype.hasOwnProperty.call(values, key);
      delete values[key];
      return existed;
    },
    save: () => {},
  };
  const sync = createCommonStoreSync({
    cache,
    isRemote: () => true,
    patchRemote:
      patchRemoteOverride ??
      (async (patch) => {
        calls.push(patch);
        const next = { ...values };
        for (const key of patch.remove) delete next[key];
        Object.assign(next, patch.set);
        values = next;
        return { runtimeId: "runtime-a", revision: calls.length, values: { ...next } };
      }),
    persistCommitted: (snapshot) => persisted.push({ ...snapshot }),
  });
  return { calls, getPersisted: () => persisted, getValues: () => values, sync };
}

describe("CommonStore sync", () => {
  it("flushes only dirty keys", async () => {
    const { calls, sync } = makeHarness();
    sync.set("theme", "dark");

    await sync.flush();

    expect(calls).toEqual([{ set: { theme: "dark" }, remove: [] }]);
  });

  it("applies a remote snapshot without dirtying keys", () => {
    const { getValues, sync } = makeHarness();

    sync.applySnapshot({
      runtimeId: "runtime-a",
      revision: 2,
      values: { theme: "dark", sort: "date", external: true },
    });

    expect(getValues()).toEqual({ theme: "dark", sort: "date", external: true });
    expect(sync.getDirtyKeys()).toEqual([]);
  });

  it("rolls back only the failed patch and preserves remote committed values", async () => {
    const { getValues, sync } = makeHarness(undefined, async () => {
      throw new Error("disk unavailable");
    });
    sync.set("theme", "dark");
    sync.applySnapshot({
      runtimeId: "runtime-a",
      revision: 2,
      values: { theme: "light", sort: "date", external: true },
    });

    await expect(sync.flush()).rejects.toThrow("disk unavailable");
    expect(sync.getDirtyKeys()).toEqual([]);
    expect(getValues()).toEqual({ theme: "light", sort: "date", external: true });
  });
});
