import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/fonts/fira_code",
);
const originals = {
  Regular: "5992ab9640e2df491b2f609467b1de60e8bc39b2c28db184342a0592d98f6117",
  Bold: "41f6554e845e2f5b70adad3950122334b866aac436793b7742ade600067701be",
};
export async function generateFontSources(check = false) {
  const sources: Record<string, string> = {};
  for (const [weight, expected] of Object.entries(originals)) {
    const bytes = await readFile(path.join(root, `FiraCode-${weight}.ttf`));
    if (createHash("sha256").update(bytes).digest("hex") !== expected)
      throw new Error(`Fira Code ${weight} 与 6.2 原始资源不一致`);
    sources[`fira-code-${weight.toLowerCase()}`] =
      `data:font/ttf;base64,${bytes.toString("base64")}`;
  }
  const text = JSON.stringify(sources) + "\n",
    output = path.join(root, "web_sources.json");
  if (check) {
    if ((await readFile(output, "utf8")) !== text)
      throw new Error("内置字体构建资源过期，请运行 fonts:generate");
  } else await writeFile(output, text);
}
if (import.meta.main) {
  await generateFontSources(process.argv.includes("--check"));
  console.log("内置字体资源校验通过");
}
