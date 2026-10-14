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

## 修改 patch 的强制约束

- 必须保持最小改动：只修改本次目标所需的文件和 hunk；不顺手格式化、重排、改换行，
  不重生成无关 diff 块或删除已有注释。
- 必须保留旧 patch 的行为。先在同版本未打补丁的上游源码副本中成功应用全部旧改动，
  再加入本次改动；不能只复制本次编辑的文件来构造最终源码。
- 本次新增文件若不在旧 patch 中，可从该文件的上游版本到最终版本生成完整 diff 后追加，
  避免重生成无关块；若旧 patch 已修改同一文件，则必须基于包含全部旧改动的最终文件
  生成 diff，遵守下文的完整文件行号规则，不能直接拼接基于已打补丁源码的增量 diff。
- 修改完成后必须进行下文的 diff review。hunk 校验、安装成功或编译成功都不能证明
  旧功能仍然完整；遇到无法解释的删除或大量无关改动，应停止交付并继续排查。

## 修改完成后必须进行 diff review

review 的对象是“修改前的完整 patch”与“修改后的完整 patch”，不是只看本次源码改动。
修改前先保留 patch 副本；已有未提交改动时，以修改前的工作区文件为基准，不只与 HEAD 比较。

1. 逐项检查消失的文件、diff 块、hunk 和删除行是否确有必要；新增内容是否只服务于本次目标。
2. 核对旧功能的完整链路：声明、定义、调用入口、JS → Native 参数转换、
   Native → JS 事件分发、平台/版本条件和完成后的清理逻辑；不能只确认函数还存在。
   若包同时发布 TypeScript、ESM、CommonJS 入口，应检查各入口行为一致。
3. 运行 hunk 行数校验、同版本源码副本的 dry-run 和 Bun 实际应用验证；
   将 Bun 应用后的所有目标文件与预期最终源码副本逐文件、逐字比较。
4. 回归新增行为及受影响的旧行为；库、示例应用和业务应用中的同步 patch 必须逐字节一致。
5. 记录 diff review 结论、验证范围及尚未完成的平台验证。未解释清楚的行为变化不能视为通过。

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

### 先确认 Git 没有跳过旧补丁

重新生成完整 patch 前，应用旧补丁的步骤必须检查实际结果，不能只看 exit code。
在仓库子目录运行 `git apply --directory=...` 时，目标路径可能被解释为仓库根目录下的
路径；如果目标位于当前子目录范围外，Git 会跳过 patch，且仍返回成功。

例如在 `ui/` 中执行 `--directory=.temp/patchgen/...`，可能出现
`Skipped patch '.temp/patchgen/.../ios/RNSScreenStack.mm'`。随后只复制本次编辑的文件，
会使其他文件中的旧修复从最终 patch 中消失，即使 hunk 校验和依赖安装均通过。

应在仓库根目录执行，并使用包含 `ui/` 的仓库相对目标路径；或者在仓库外的独立临时
目录中操作。先运行 `git apply --check --verbose`，实际应用时也使用 `--verbose`，确认
所有预期文件都有 `Applied patch ... cleanly`，没有任何 `Skipped patch`。
任何 `Skipped patch` 都应视为失败，不得继续用该副本生成新 patch。生成后还要
逐项核对旧功能的完整调用链，并将 Bun 安装后的目标文件与最终源码副本逐字比较。

### 检查 Bun 实际应用结果

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

## 同一源文件追加 hunk 的检查清单

当已有 patch 已经修改同一个源文件，而需要再追加一个独立 hunk 时，按下面的顺序处理：

1. 以未打补丁的上游文件作为旧文件基准，构造包含已有改动和新增改动的最终文件。
2. 用这两个完整文件生成 diff；后续 hunk 的 `-旧文件起始行号` 对应上游文件，
   `+新文件起始行号` 对应包含前序 hunk 后的最终文件。
3. 若为了阅读性把新增 hunk 放入同一 `.patch` 的另一个 `diff --git` 块，只摘取生成结果中的
   hunk 正文和 hunk 头，不改写其中的行号或上下文行。
4. 不要以已打补丁的 `node_modules` 文件作为“旧文件”单独生成小 diff，再把它追加到原 patch；
   该小 diff 的行号和上下文不代表 Bun 处理完整 patch 时的文件状态。
5. 运行 hunk 行数校验后，在真实应用目录重新安装并检查目标代码的前后唯一锚点。

这里的关键不是让人手计算偏移量，而是让 diff 工具同时看到上游文件和最终文件。Bun 会依次处理
同一 patch 中的改动；hunk 头中的坐标、上下文和行数必须保持生成时的完整文件关系，手工“修正”
后续 hunk 的位置往往会同时破坏其中至少一项。
