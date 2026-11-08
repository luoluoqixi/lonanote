import { useEffect, useState, useSyncExternalStore } from "react";
import { View } from "react-native";
import WebView from "react-native-webview";

import { fontProbe } from "@/fonts/font_probe";

/** 与真实编辑器相同的 WebView 引擎验证 local()，不通过 bridge 传字体文件。 */
export function FontProbeHost() {
  const probe = useSyncExternalStore(fontProbe.subscribe, fontProbe.getSnapshot);
  const [sources, setSources] = useState<Record<string, string> | null>(null);
  const bundled = probe?.font.faces.some((face) => face.source.kind === "bundled");
  useEffect(() => {
    if (!bundled || sources || !probe) return;
    let active = true;
    import("../../../assets/fonts/fira_code/web_sources.json").then(
      (module) => {
        if (active) setSources(module.default);
      },
      () => fontProbe.finish(probe.id, "内置字体资源加载失败"),
    );
    return () => {
      active = false;
    };
  }, [bundled, sources, probe]);
  if (!probe) return null;
  if (bundled && !sources) return null;
  const config = JSON.stringify(probe).replace(/</g, "\\u003c");
  const resources = JSON.stringify(bundled ? sources : {}).replace(/</g, "\\u003c");
  const html = `<!doctype html><meta charset="utf-8"><script>const probe=${config};const resources=${resources};Promise.all(probe.font.faces.map(face=>new FontFace(probe.font.family,face.source.kind==='bundled'?'url('+JSON.stringify(resources[face.source.assetId])+')':'local('+JSON.stringify(face.source.name)+')',{weight:String(face.weight),style:face.italic?'italic':'normal'}).load())).then(()=>window.ReactNativeWebView.postMessage(JSON.stringify({id:probe.id}))).catch(()=>window.ReactNativeWebView.postMessage(JSON.stringify({id:probe.id,error:'此字体无法在编辑器中加载'})));</script>`;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
    >
      <WebView
        key={probe.id}
        source={{ html }}
        javaScriptEnabled
        onMessage={(event) => {
          try {
            const result = JSON.parse(event.nativeEvent.data);
            if (result.id === probe.id) fontProbe.finish(result.id, result.error);
          } catch {
            fontProbe.finish(probe.id, "字体验证响应无效");
          }
        }}
        onError={() => fontProbe.finish(probe.id, "字体验证失败")}
      />
    </View>
  );
}
