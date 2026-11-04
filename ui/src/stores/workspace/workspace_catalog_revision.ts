import { createStore } from "zustand/vanilla";

/** Catalog 列表的失效信号，数据权威仍由 Rust 持有。 */
export const workspaceCatalogRevisionStore = createStore(() => ({ revision: 0 }));
