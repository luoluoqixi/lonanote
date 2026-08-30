# Bun patch：同一文件多个 diff 块的产出与验证

本文说明：当一个 Bun patch 中同一目标文件需要保留多个 `diff --git` 块时，如何正确
产出 patch 并验证 Bun 实际应用后的结果。

## 结论

同一个目标文件可以在一个 `.patch` 中出现多个 `diff --git` 块，以便让后续改动保持
独立、易读。但后一个块的每个 hunk 的 `+新文件起始行号` 必须以**完整补丁应用后的
文件**为准，计入前一个块在该文件前方新增或删除的所有行。

不能只从未修改的上游文件单独生成后一个小改动，再直接追加到已有 patch。这样得到的
`+新文件起始行号` 不包含前一个块的偏移；Bun 应用补丁时会按该行号插入，可能把代码放进
无关的类型、函数体或回调闭包中。

## 常见失败现象

假设原始文件中某个目标区域位于约第 1602 行，而同文件的第一个 diff 块已经在它之前
增加了大量内容。完整 patch 应用后，这个区域可能实际位于约第 2022 行。

错误 hunk：

```diff
@@ -1602,11 +1623,19 @@
```

其中 `+1623` 是孤立改动生成时的行号。清除缓存并重新安装后，新增代码可能被插入到
无关的位置，并引发语言语法或类型错误。

正确 hunk：

```diff
@@ -1602,11 +2022,19 @@
```

重新安装后，新增代码应位于预期的相邻代码块之间：

```swift
firstOperation()

insertedOperation()

nextOperation()
```

## 推荐产出流程

1. 准备与实际依赖版本完全一致的上游原始文件。
2. 在临时副本中先应用该文件已有的所有 patch 改动，再加入新增改动。
3. 用 `git diff --no-index` 从“上游原始文件”到“最终文件”生成完整 diff。这样每个 hunk
   的新文件行号都反映最终布局。
4. 如需保留同一文件的多个 diff 块，可将新增改动对应的完整 hunk 单独放到后一个
   `diff --git` 块；保留生成的 `@@ -旧行,+新行 @@` 头，尤其不要把 `+新行` 改回孤立
   小 diff 的行号。
5. 将本文「内嵌 hunk 完整性校验脚本」保存到仓库内的临时路径，例如
   `.temp/patch-tools/validate_patch_hunks.cjs`，再运行 hunk 完整性校验：

   ```bash
   node .temp/patch-tools/validate_patch_hunks.cjs \
     patches/@scope+package@version.patch
   ```

   这一步只校验 hunk 行数，不验证 Bun 实际的定位结果。

## 内嵌 hunk 完整性校验脚本

以下是本文所需校验脚本的完整内容，不依赖仓库外部路径。将其保存为
`validate_patch_hunks.cjs` 后即可按上面的相对路径命令执行。

```js
#!/usr/bin/env node
/**
 * 校验 unified diff 中每个 hunk 头的行数是否与正文一致（Bun patchedDependencies 同类规则）。
 */
const fs = require("fs");
const path = require("path");

function validatePatch(filePath) {
  const lines = fs
    .readFileSync(filePath, "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();

  let i = 0;
  let hunkIndex = 0;
  let failures = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith("@@ ")) {
      i++;
      continue;
    }
    hunkIndex++;
    const parts = line.split(" ");
    const oldPart = parts[1]?.slice(1).split(",") ?? [];
    const newPart = parts[2]?.slice(1).split(",") ?? [];
    const wantOld = +(oldPart[1] || 1);
    const wantNew = +(newPart[1] || 1);

    let gotOld = 0;
    let gotNew = 0;
    let j = i + 1;
    for (; j < lines.length; j++) {
      const x = lines[j];
      if (
        x.startsWith("@@ ") ||
        x.startsWith("diff --git ") ||
        x.startsWith("--- ") ||
        x.startsWith("+++ ") ||
        x.startsWith("index ")
      ) {
        break;
      }
      if (x.startsWith("+")) gotNew++;
      else if (x.startsWith("-")) gotOld++;
      else if (x.startsWith(" ")) {
        gotOld++;
        gotNew++;
      } else if (x === "") {
        gotOld++;
        gotNew++;
      } else if (x.startsWith("\\ No newline at end of file")) {
        // pragma，不计行
      } else {
        console.error(
          `WARN ${path.basename(filePath)} hunk #${hunkIndex}: unrecognized line: ${JSON.stringify(x)}`,
        );
      }
    }

    if (wantOld !== gotOld || wantNew !== gotNew) {
      failures++;
      console.error(
        `FAIL ${path.basename(filePath)} hunk #${hunkIndex}: ${line}\n` +
          `  want old=${wantOld} new=${wantNew}, got old=${gotOld} new=${gotNew}`,
      );
    }
    i = j;
  }

  return { hunkIndex, failures };
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Usage: node validate_patch_hunks.cjs <patch> [patch2 ...]");
    process.exit(2);
  }

  let totalFail = 0;
  for (const f of files) {
    const p = path.resolve(f);
    if (!fs.existsSync(p)) {
      console.error(`not found: ${p}`);
      totalFail++;
      continue;
    }
    const { hunkIndex, failures } = validatePatch(p);
    if (failures === 0) {
      console.log(`OK ${path.basename(p)} (${hunkIndex} hunks)`);
    } else {
      totalFail += failures;
    }
  }
  process.exit(totalFail > 0 ? 1 : 0);
}

main();
```

## 必做的 Bun 验证

必须在**实际声明 `patchedDependencies` 的应用目录**执行，而不是在没有
`patchedDependencies` 的库根目录执行：

```bash
bun run clear-patch-cache
bun install --force
```

然后直接检查生成结果，无需先编译：

```bash
rg -n -C 5 \
  '<前置唯一锚点>|<新增代码的唯一标识>|<后置唯一锚点>' \
  node_modules/<scope>/<package>/<目标文件>
```

验收条件：

- 新增代码不在无关的类型、函数或闭包内；
- 新增代码位于预期的相邻代码块之间；
- 没有破坏原有语法结构或截断相邻语句。

## Bun 1.3.x 的额外注意事项

上面的 hunk 完整性校验只检查 `@@` 头部声明的旧行数、新行数是否与正文一致；它不检查 Bun
最终把新增行放到了哪一个上下文锚点。因此出现 `OK ... hunks` 仍然可能把代码插入闭包、回调或
其他相邻语句内部，必须检查实际安装目录中的最终源码结构。

### 纯新增 hunk 可能选错插入锚点

对于同一文件中后续追加的纯新增 hunk（正文只有上下文行和 `+` 行），Bun 1.3.x 在某些行号偏移
组合下可能把新增行放在 hunk 的前一个上下文位置，而不是预期的闭包结束行之后。这个行为不会被
标准 diff 工具或本文件的行数校验发现。

需要在语句边界插入代码时，优先把目标边界改写成替换 hunk，让插入位置由唯一的旧行确定：

```diff
@@ -66,1 +66,2 @@
-      }
+      }
+      .fixedSize(...)
```

这样比只写 `}` 的上下文再追加一行更稳定。修改后要在真实应用目录重新安装，并确认新增语句位于
目标闭包结束之后，而不是 `Children()`、回调参数或其他嵌套结构之前。

### hunk 与下一个 diff 块之间不要放空行

Bun 的 patch 解析器不会始终把空行视为 diff 块之间的视觉分隔符。如果一个 hunk 结束后、下一个
`@@` 或 `diff --git` 标记前有空行，Bun 可能将该空行计入前一个 hunk 的上下文行，最终触发：

```text
failed to parse patchfile: hunk_header_integrity_check_failed
```

因此不要手工在 hunk 和下一个 diff 块之间插入空行；需要新增另一个 diff 块时，直接让前一个 hunk
的最后一行紧接 `diff --git` / `---` / `+++` 或下一个 `@@` 标记。每次修改后都运行仓库内的
`validate_patch_hunks.cjs`，确认每个 hunk 的 old/new 行数仍然一致。

### 手工修改 hunk 正文后必须同步更新 hunk 头

`@@ -旧起始,旧行数 +新起始,新行数 @@` 中的行数不是注释，而是 Bun 解析 patch 的完整性校验依据。
在已经生成的 patch 中增删一行（包括注释、空行或右花括号）后，如果只改正文而没有重新统计
`+新行数`，Bun 会报：

```text
failed to parse patchfile: hunk_header_integrity_check_failed
```

这类错误容易被误判为“后续 hunk 行号偏移”。实际应先逐行统计当前 hunk：`+` 行只计入新文件，
`-` 行只计入旧文件，空格开头的上下文行同时计入两边；然后更新 hunk 头。不能只调整
`+新文件起始行号`，也不能把新增内容改成没有 `+` 前缀的普通文本。两份同步维护的 patch
（例如库根目录和 `examples/app`）必须在修改后逐字节比较，避免一份可应用、另一份仍然损坏。

建议每次手工修改后按以下顺序验证：

1. 运行 hunk 行数校验脚本，确保所有 hunk 的 old/new 行数匹配。
2. 使用系统 `patch --dry-run -p1` 在同版本依赖的临时副本中验证实际定位。
3. 再检查 `git diff --check`，确认没有意外的空白错误。

### 校验缓存和实际安装目录

Bun 会复用 patched package 缓存以及现有 `node_modules` 内容。仅修改 patch 后执行一次普通的
`bun install`，不一定能反映最新 patch；验证时应：

1. 在声明 `patchedDependencies` 的应用目录操作，而不是只在组件库根目录操作。
2. 优先运行项目的 patch-cache 清理脚本；如果它因 Bun 缓存目录中的 `.bun-tag-*` 权限错误失败，
   可只删除应用目录内目标生成包（例如 `node_modules/@expo/ui`），再执行 `bun install --force`。
3. 直接读取 `node_modules/<包>/<目标文件>`，检查最终源码位置和语法结构。

不要把 `/Users/.../.bun/install/cache` 下的整个缓存目录作为清理目标；只处理明确对应的包或让 Bun
在下一次安装时重新生成它，避免影响其他项目的依赖缓存。

如果业务应用同步了库的 patch，也必须在该应用自己的依赖目录重复相同的
“清缓存 → 强制安装 → 检查 node_modules”流程。
