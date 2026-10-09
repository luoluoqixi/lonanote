import { confirmNative } from "rn-ui-kit";

import type {
  ScanWorkspaceConflictCandidate,
  ScanWorkspaceIdConflict,
} from "@/api/commands/workspace";
import { getFileName } from "@/api/common/utils/file_type_utils";

function getFolderName(candidate: ScanWorkspaceConflictCandidate): string {
  const location = candidate.locationLabel.replace(/\\/g, "/");
  return location.includes("/") ? getFileName(location).trim() : candidate.displayName;
}

function getCandidateLabels(
  first: ScanWorkspaceConflictCandidate,
  second: ScanWorkspaceConflictCandidate,
): [string, string] {
  const names: [string, string] = [getFolderName(first), getFolderName(second)];
  if (names[0] !== names[1]) return names;

  // 同名目录只补充足以区分的位置后缀，避免展示移动端冗长的沙盒路径。
  const locations = [first, second].map((candidate) =>
    candidate.locationLabel
      .replace(/\\/g, "/")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean),
  );
  const maxDepth = Math.max(locations[0].length, locations[1].length);
  for (let depth = 2; depth <= maxDepth; depth += 1) {
    const labels: [string, string] = [
      locations[0].slice(-depth).join("/"),
      locations[1].slice(-depth).join("/"),
    ];
    if (labels[0] !== labels[1]) return labels;
  }
  return [`${names[0]}（1）`, `${names[1]}（2）`];
}

function describeCandidate(name: string, candidate: ScanWorkspaceConflictCandidate): string {
  const status = candidate.isRegistered ? "已注册" : "未注册";
  return `${name}（${status}${candidate.isOpen ? "，已打开" : ""}）`;
}

/** 整组只记录最终保留者；任何一步跳过或关闭弹窗都不提交文件修改。 */
export async function chooseScanIdConflictKeeper(
  conflict: ScanWorkspaceIdConflict,
): Promise<number | null> {
  let keepIndex = 0;
  const comparisonCount = conflict.candidates.length - 1;
  for (let nextIndex = 1; nextIndex < conflict.candidates.length; nextIndex += 1) {
    const lastComparison = nextIndex === comparisonCount;
    const first = conflict.candidates[keepIndex];
    const second = conflict.candidates[nextIndex];
    const [firstName, secondName] = getCandidateLabels(first, second);
    const result = await confirmNative({
      buttons: [
        { key: "skip", style: "cancel", text: "跳过本组" },
        { key: "keep-a", text: `保留 ${firstName} 的ID` },
        { key: "keep-b", text: `保留 ${secondName} 的ID` },
      ],
      message: `${describeCandidate(firstName, first)}\n${describeCandidate(secondName, second)}\n\n选择保留原 ID 的文件夹，其余生成新 ID。\n${lastComparison ? "确认后更新本组。" : "完成全部选择后更新，跳过不作修改。"}`,
      title:
        comparisonCount > 1
          ? `工作区 ID 重复（${nextIndex}/${comparisonCount}）`
          : "工作区 ID 重复",
    });
    if (result !== "keep-a" && result !== "keep-b") {
      return null;
    }
    if (result === "keep-b") {
      keepIndex = nextIndex;
    }
  }
  return keepIndex;
}
