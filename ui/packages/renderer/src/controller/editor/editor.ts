import debounce from 'lodash/debounce';
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

import { useSettings } from '../settings';
import { workspaceController } from '../workspace';

export const useEditor = useEditorStore;

export const setCurrentEditFile = async (
  currentEditFile: string | null,
  clearHistory?: boolean,
) => {
  if (window.navigate) {
    window.navigateFile?.(currentEditFile);
    if (clearHistory) {
      history.replaceState({}, document.title, window.location.pathname);
    }
  }
};

export const getCurrentEditFile = () => {
  return window.getCurrentFile?.();
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

type UpdateContentAutoSaveFunc = (
  autoSave: boolean,
  getEditorValue: () => string | null | undefined,
) => void;

const debounceUpdateContentAutoSaveInnerMap = new Map<number, UpdateContentAutoSaveFunc>();

const updateContentAutoSaveInner: UpdateContentAutoSaveFunc = (autoSave, getEditorValue) => {
  const content = getEditorValue();
  if (content == null) return;
  const currentContent = useEditorStore.getState().currentEditorContent;
  if (
    currentContent == null ||
    currentContent.content.length !== content.length ||
    currentContent.content !== content
  ) {
    console.log(autoSave, '变化');
    if (autoSave) {
      // useEditorStore.setState({});
    }
  }
};
const debounceUpdateContentAutoSaveInner = (
  autoSave: boolean,
  getEditorValue: () => string | null | undefined,
  wait: number,
) => {
  if (!debounceUpdateContentAutoSaveInnerMap.has(wait)) {
    debounceUpdateContentAutoSaveInnerMap.set(wait, debounce(updateContentAutoSaveInner, wait));
  }
  const fun = debounceUpdateContentAutoSaveInnerMap.get(wait)!;
  fun(autoSave, getEditorValue);
};

export const updateContentAutoSave = (getEditorValue: () => string | null | undefined) => {
  const autoSave = useSettings.getState().settings?.autoSave;
  const autoSaveInterval = useSettings.getState().settings?.autoSaveInterval;
  if (autoSave) {
    let wait = autoSaveInterval == null ? 1000 : autoSaveInterval * 1000;
    if (wait < 100) {
      wait = 100; // 最小100ms
    }
    debounceUpdateContentAutoSaveInner(true, getEditorValue, wait);
  } else {
    debounceUpdateContentAutoSaveInner(false, getEditorValue, 200);
  }
};

export const saveContent = async (content: string) => {
  if (content == null) return;
  const ws = workspaceController.useWorkspace.getState().currentWorkspace;
  if (!ws) return;
  const wsPath = ws.metadata.path;
  const file = getCurrentEditFile();
  if (file == null) return;
  const filePath = path.join(wsPath, file);
  console.log(filePath);
  fs.write(filePath, content)
    .then(() => {
      toast.success('保存文件成功');
    })
    .catch((e) => {
      console.error('保存文件失败', e);
      toast.error(`保存文件失败: ${e.message}`);
    });
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
