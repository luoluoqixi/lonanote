import path from 'path-browserify-esm';
import { toast } from 'react-toastify';

import { fs } from '@/bindings/api';
import {
  EditorBackEnd,
  EditorContent,
  EditorMode,
  EditorState,
  defaultEditorBackEnd,
  defaultEditorIsReadOnly,
  defaultEditorMode,
  saveEditorBackEnd,
  saveEditorMode,
  useEditorStore,
} from '@/models/editor';

import { workspaceController } from '../workspace';

export const useEditor = useEditorStore;

export const setCurrentEditFile = async (
  currentEditFile: string | null,
  clearHistory?: boolean,
) => {
  if (window.navigate) {
    const to = `/${currentEditFile ? encodeURIComponent(currentEditFile) : ''}`;
    window.navigate(to);
    if (clearHistory) {
      history.replaceState({}, document.title, window.location.pathname);
    }
  }
};

export const parseCurrentEditFile = (file: string | null | undefined) => {
  return file ? decodeURIComponent(file) : null;
};

export const getCurrentEditFile = () => {
  const hash = location.hash;
  if (hash && hash.startsWith('#/')) {
    return parseCurrentEditFile(hash.substring(2));
  }
  return null;
};

export const setCurrentEditorState = async (currentEditorStatus: EditorState | null) => {
  useEditorStore.setState((state) => ({ ...state, currentEditorStatus }));
};

// export const setCurrentEditorContent = async (currentEditorContent: string | null) => {
//   useEditorStore.setState((state) => ({
//     ...state,
//     currentEditorContent:
//       currentEditorContent != null
//         ? {
//             content: currentEditorContent,
//           }
//         : null,
//   }));
// };

export const updateContent = (content: EditorContent | null) => {
  useEditorStore.setState((state) => ({
    ...state,
    currentEditorContent: content,
  }));
};

export const saveContent = async (content: string, force: boolean) => {
  if (content == null) return;
  const ws = workspaceController.useWorkspace.getState().currentWorkspace;
  if (!ws) return;
  const wsPath = ws.metadata.path;
  const file = getCurrentEditFile();
  if (file == null) return;
  const filePath = path.join(wsPath, file);
  console.log(filePath);
  if (force) {
    fs.write(filePath, content)
      .then(() => {
        toast.success('保存文件成功');
      })
      .catch((e) => {
        console.error('保存文件失败', e);
        toast.error(`保存文件失败: ${e.message}`);
      });
  }
};

export const setEditorIsReadOnly = async (editorIsReadOnly: boolean) => {
  useEditorStore.setState((state) => ({ ...state, editorIsReadOnly }));
};

export const setEditorMode = async (editorMode: EditorMode) => {
  useEditorStore.setState((state) => ({ ...state, editorMode }));
  saveEditorMode(editorMode);
};

export const setEditorBackEnd = async (editorBackEnd: EditorBackEnd) => {
  useEditorStore.setState((state) => ({ ...state, editorBackEnd }));
  saveEditorBackEnd(editorBackEnd);
};

export { defaultEditorMode, defaultEditorIsReadOnly, defaultEditorBackEnd };
