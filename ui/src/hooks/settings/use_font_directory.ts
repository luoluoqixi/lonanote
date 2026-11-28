import { useEffect, useState } from "react";

import type { FontConsumer, FontFamilyEntry } from "@/api/commands/fonts/types";
import {
  getFontDirectoryError,
  listFontFamilies,
  prepareFontFamily,
  verifyFontFamily,
} from "@/stores/font_store";

export function useFontDirectory(open: boolean) {
  const [entries, setEntries] = useState<FontFamilyEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    listFontFamilies(revision > 0)
      .then(
        (value) => {
          if (active) {
            setEntries(value);
            setError(getFontDirectoryError());
          }
        },
        (reason) => {
          if (active) setError(String(reason));
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, revision]);
  return { entries, error, loading, retry: () => setRevision((value) => value + 1) };
}

export function useFontCapability(entry: FontFamilyEntry, consumer: FontConsumer) {
  const [available, setAvailable] = useState<boolean | undefined>();
  useEffect(() => {
    let active = true;
    setAvailable(undefined);
    verifyFontFamily(entry, consumer).then((value) => {
      if (active) setAvailable(value);
    });
    return () => {
      active = false;
    };
  }, [entry, consumer]);
  return available;
}

/** 名称由 UI 渲染；editor 的 WebView family 不一定能在 Native Text 中使用。 */
export function useFontPreviewFamily(entry: FontFamilyEntry) {
  const [family, setFamily] = useState<string>();
  useEffect(() => {
    let active = true;
    setFamily(undefined);
    void prepareFontFamily(entry, "ui").then((font) => {
      if (active) setFamily(font?.family);
    });
    return () => {
      active = false;
    };
  }, [entry]);
  return family;
}
