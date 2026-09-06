import { UnknownFileViewer } from "./unknown_file_viewer";

/** iOS/Android 交由系统文件查看器处理 PDF，避免将内容复制到 JS。 */
export function PdfViewer() {
  return <UnknownFileViewer />;
}
