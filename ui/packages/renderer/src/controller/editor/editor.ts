import debounce from 'lodash/debounce';
import path from 'path-browserify-esm';
import { toast } from 'react-toastify';

import { fs } from '@/bindings/api';
import { dialog } from '@/components';
import {
  EditorBackEnd,
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

export const setCurrentEditFileIf = async (
  currentEditFile: string | null,
  clearHistory?: boolean,
) => {
  const settings = useSettings.getState().settings;
  if (!settings?.autoSave && !settings?.autoSaveFocusChange) {
    if (useEditor.getState().currentEditorIsDirty) {
      dialog.showDialog({
        title: '警告',
        content: '当前有未保存的内容, 确定要离开吗？',
        onOk: () => {
          setCurrentEditFile(currentEditFile, clearHistory);
        },
      });
      return;
    }
  }
  await setCurrentEditFile(currentEditFile, clearHistory);
};

export const setCurrentEditFile = async (
  currentEditFile: string | null,
  clearHistory?: boolean,
) => {
  if (window.navigate) {
    await saveDirtyFocus();
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

export const updateContent = (content: string | null) => {
  useEditorStore.setState((state) => ({
    ...state,
    currentEditorContent: content,
    currentEditorIsDirty: false,
  }));
};

type UpdateContentAutoSaveFunc = (
  autoSave: boolean | undefined,
  autoSaveInterval: number,
  getEditorValue: () => string | null | undefined,
) => void;

const updateContentAutoSaveInner: UpdateContentAutoSaveFunc = (
  autoSave,
  autoSaveInterval,
  getEditorValue,
) => {
  const content = getEditorValue();
  if (content == null) return;
  const currentContent = useEditorStore.getState().currentEditorContent;
  if (
    currentContent == null ||
    currentContent.length !== content.length ||
    currentContent !== content
  ) {
    saveContent(content, autoSave, autoSaveInterval);
  }
};
const debounceUpdateContentAutoSaveInner = debounce(updateContentAutoSaveInner, 100);

export const updateContentAutoSave = (getEditorValue: () => string | null | undefined) => {
  const autoSave = useSettings.getState().settings?.autoSave;
  const autoSaveInterval = useSettings.getState().settings?.autoSaveInterval;
  let wait = autoSaveInterval == null ? 1000 : autoSaveInterval * 1000;
  if (wait < 100) {
    wait = 100; // 最小100ms
  }
  debounceUpdateContentAutoSaveInner(autoSave, wait, getEditorValue);
};

export const saveDirtyFocus = async () => {
  const autoSaveFocus = useSettings.getState().settings?.autoSaveFocusChange;
  if (autoSaveFocus) saveDirtyContent();
};

const saveDirtyContent = async () => {
  const isDirty = useEditorStore.getState().currentEditorIsDirty;
  const content = useEditorStore.getState().currentEditorContent;
  if (isDirty && content) {
    await saveContent(content, true);
  }
};

let saveInterval: number | null = null;

export const saveContent = async (
  content: string,
  force: boolean | undefined,
  interval?: number,
) => {
  if (content == null) return;
  const ws = workspaceController.useWorkspace.getState().currentWorkspace;
  if (!ws) return;
  const wsPath = ws.metadata.path;
  const file = getCurrentEditFile();
  if (file == null) return;
  const filePath = path.join(wsPath, file);
  const s = useEditorStore.getState();
  if (force) {
    useEditorStore.setState({
      ...s,
      currentEditorContent: content,
      currentEditorIsDirty: true,
    });
    const save = async () => {
      try {
        await fs.write(filePath, content);
        // toast.success('保存文件成功');
        const s = useEditorStore.getState();
        useEditorStore.setState({
          ...s,
          currentEditorIsDirty: false,
          nowSaved: true,
        });
      } catch (e: any) {
        console.error('保存文件失败', e);
        toast.error(`保存文件失败: ${e.message}`);
      }
    };
    if (interval) {
      if (saveInterval != null) {
        window.clearTimeout(saveInterval);
        saveInterval = null;
      }
      saveInterval = window.setTimeout(save, interval);
    } else {
      await save();
    }
  } else {
    useEditorStore.setState({
      ...s,
      currentEditorContent: content,
      currentEditorIsDirty: true,
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
