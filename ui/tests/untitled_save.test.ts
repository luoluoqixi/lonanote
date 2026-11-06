import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("隔离运行无标题保存与关闭回归", async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      "test",
      fileURLToPath(new URL("./untitled_save.fixture.ts", import.meta.url)),
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [status, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (status !== 0) throw new Error(`${stdout}\n${stderr}`);
  expect(status).toBe(0);
});
