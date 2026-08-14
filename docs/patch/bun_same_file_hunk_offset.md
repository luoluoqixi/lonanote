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
  const lines = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").split("\n");
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
        console.error(`WARN ${path.basename(filePath)} hunk #${hunkIndex}: unrecognized line: ${JSON.stringify(x)}`);
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

如果业务应用同步了库的 patch，也必须在该应用自己的依赖目录重复相同的
“清缓存 → 强制安装 → 检查 node_modules”流程。
