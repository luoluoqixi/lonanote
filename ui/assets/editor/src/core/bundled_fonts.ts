/** 数据由原始 TTF 在构建准备阶段生成；只接受固定资源身份。 */
export async function bundledFontUrl(assetId: "fira-code-regular" | "fira-code-bold"): Promise<string> {
  const sources = (await import("../../../fonts/fira_code/web_sources.json")).default;
  const source = sources[assetId];
  if (!source) throw new Error("未知内置字体资源");
  return source;
}
