import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("首快照失败不得宣称同步就绪或无限挂起工作区启动", async () => {
  // Bun 的 module mock 跨文件共享；启动桥接测试须独立进程，避免污染其他套件。
  const child = Bun.spawn(
    [
      process.execPath,
      fileURLToPath(new URL("./fixtures/config_sync_failure.ts", import.meta.url)),
    ],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
});

for (const scenario of ["native", "native-document", "headless", "web"]) {
  test(`配置同步兼容 ${scenario} 环境并正确清理事件`, async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        fileURLToPath(new URL("./fixtures/config_sync_environment.ts", import.meta.url)),
        scenario,
      ],
      { cwd: fileURLToPath(new URL("..", import.meta.url)), stdout: "pipe", stderr: "pipe" },
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect({ exitCode, output: stdout + stderr }).toEqual({ exitCode: 0, output: "" });
  });
}
