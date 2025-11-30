import clsx from 'clsx';
import path from 'path-browserify-esm';
import { commands } from 'purrmd';
import {
  CSSProperties,
  Ref,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import { system } from '@/bindings/api';
import { useColorMode } from '@/components/provider/ColorModeProvider';
import { utils } from '@/utils';

import { EditorMode } from '../types';
import './LonaEditor.scss';
import { LonaEditor } from './editor';
import { useLonaEditor } from './hooks';
import { langs } from './lang';

export interface LonaEditorRef {
  getEditor: () => LonaEditor | null;
  setValue: (content: string, useHistory?: boolean) => void;
  getValue: () => string | null;
}

export interface UpdateState {
  charCount: number;
  rowIndex: number;
  colIndex: number;
}

export interface LonaEditorProps {
  isMdEditor: boolean;
  /** 基于当前workspace的根目录 */
  workspaceRootPath: string;
  /** 基于当前文件的根目录 */
  mediaRootPath: string;
  /** 默认上传文件的路径 */
  defaultUploadPath: string;
  /** 默认上传附件的路径 */
  defaultUploadAttachmentPath: string;
  editorId: string;
  editMode: EditorMode;
  filePath: string;
  style?: CSSProperties;
  className?: string;
  readOnly?: boolean;
  initValue: string | null;
  showLineNumber?: boolean;
  lineWrap?: boolean;
  onFocusChange?: (focus: boolean) => void;
  onSave?: (content: string) => void;
  onUpdateStateListener?: (state: UpdateState) => void;
  onUpdate?: () => void;
  onClickAnyLink?: (link: string) => void;
}

const contextMenus = [
  {
    id: 'text-formatting',
    label: '文本格式',
    submenu: [
      {
        id: 'text-bold',
        label: '加粗',
      },
      {
        id: 'text-italic',
        label: '斜体',
      },
      {
        id: 'text-underline',
        label: '删除线',
      },
      {
        id: 'text-highlight',
        label: '高亮',
      },
      {
        id: 'text-code',
        label: '代码',
      },
      {
        type: 'separator' as const,
      },
      {
        id: 'text-clear',
        label: '清除格式',
      },
    ],
  },
  {
    id: 'paragraph-settings',
    label: '段落设置',
    submenu: [
      {
        id: 'paragraph-h1',
        label: '1级标题',
      },
      {
        id: 'paragraph-h2',
        label: '2级标题',
      },
      {
        id: 'paragraph-h3',
        label: '3级标题',
      },
      {
        id: 'paragraph-h4',
        label: '4级标题',
      },
      {
        id: 'paragraph-h5',
        label: '5级标题',
      },
      {
        id: 'paragraph-h6',
        label: '6级标题',
      },
      {
        id: 'paragraph-text',
        label: '正文',
      },
      {
        type: 'separator' as const,
      },
      {
        id: 'paragraph-unordered-list',
        label: '无序列表',
      },
      {
        id: 'paragraph-ordered-list',
        label: '有序列表',
      },
      {
        id: 'paragraph-task-list',
        label: '任务列表',
      },
      {
        type: 'separator' as const,
      },
      {
        id: 'paragraph-blockquote',
        label: '引用',
      },
    ],
  },
  {
    type: 'separator' as const,
  },
  {
    id: 'cut',
    label: '剪切',
    role: 'cut' as const,
  },
  {
    id: 'copy',
    label: '复制',
    role: 'copy' as const,
  },
  {
    id: 'paste',
    label: '粘贴',
    role: 'paste' as const,
  },
  {
    id: 'select-all',
    label: '全选',
    role: 'selectAll' as const,
  },
  {
    type: 'separator' as const,
  },
  {
    id: 'undo',
    label: '撤销',
  },
  {
    id: 'redo',
    label: '重做',
  },
];

export default forwardRef((props: LonaEditorProps, ref: Ref<LonaEditorRef>) => {
  const {
    className,
    style,
    filePath,
    readOnly,
    onSave,
    onFocusChange,
    onUpdateStateListener,
    onUpdate,
    onClickAnyLink,
    mediaRootPath,
    initValue,
    editMode,
    showLineNumber,
    lineWrap,
  } = props;
  const { resolvedColorMode } = useColorMode();
  const editorRootRef = useRef<HTMLDivElement>(null);

  const editor = useLonaEditor(() => {
    if (!editorRootRef.current) {
      console.error('Editor root element is not available');
      return null;
    }
    const editor = new LonaEditor();
    editor.create({
      filePath,
      readOnly,
      defaultValue: initValue,
      theme: resolvedColorMode,
      root: editorRootRef.current,
      extensionsConfig: {
        enableLineWrapping: lineWrap,
        enableLineNumbers: showLineNumber,
      },
      markdownConfig: {
        formattingDisplayMode: editMode === 'source' ? 'show' : 'auto',
        featuresConfigs: {
          Link: {
            onLinkClickPreview(url, event) {
              event.preventDefault();
              onClickAnyLink?.(url);
            },
            onLinkClickSource(url, event) {
              if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                onClickAnyLink?.(url);
              }
            },
            clickToOpenInSource: 'controlOrCommand',
            clickToOpenInPreview: 'click',
          },
          Image: {
            proxyURL: (url) => {
              if (url === '') return url;
              if (utils.isImgUrl(url)) {
                return url;
              }
              const f = path.resolve(mediaRootPath, url);
              // if (!(await fs.exists(f))) {
              //   const f = path.resolve(path.resolve(workspaceRootPath, defaultUploadPath), url);
              //   if (await fs.exists(f)) {
              //     return utils.getMediaPath(f);
              //   }
              // }
              return utils.getMediaPath(f);
            },
          },
        },
        defaultSlashMenu: {
          title: false,
          defaultCommands: {
            heading1: { label: langs.menuHeading1 },
            heading2: { label: langs.menuHeading2 },
            heading3: { label: langs.menuHeading3 },
            heading4: { label: langs.menuHeading4 },
            heading5: { label: langs.menuHeading5 },
            heading6: { label: langs.menuHeading6 },
            unorderedList: { label: langs.menuUnorderedList },
            orderedList: { label: langs.menuOrderedList },
            taskList: { label: langs.menuTaskList },
            blockquote: { label: langs.menuBlockquote },
            codeBlock: { label: langs.menuCodeBlock },
            horizontalRule: { label: langs.menuHorizontalRule },
            link: { label: langs.menuLink },
            image: { label: langs.menuImage },
            table: { label: langs.menuTable },
          },
        },
      },
    });
    editor.addListener('onSave', (editor) => {
      onSave?.(editor.getValue() || '');
    });
    editor.addListener('onFocus', (_, focus) => {
      onFocusChange?.(focus);
    });
    editor.addListener('onUpdate', (editor) => {
      if (onUpdate) {
        onUpdate();
      }
      if (onUpdateStateListener) {
        const state = editor.getStatusInfo();
        onUpdateStateListener(state);
      }
    });
    editor.editor.dom.addEventListener('contextmenu', () => {
      openMenuClick();
    });
    return editor;
  }, [
    filePath,
    initValue,
    onSave,
    onFocusChange,
    onUpdate,
    onUpdateStateListener,
    onClickAnyLink,
    resolvedColorMode,
    showLineNumber,
    lineWrap,
  ]);

  const openMenuClick = () => {
    window.api?.contextMenu.showContextMenu(contextMenus, ({ command }) => {
      onMenuClick(command);
    });
  };

  const onMenuClick = useCallback(
    async (id: string) => {
      if (!editor || !editor.getEditor()) return;
      const e = editor.getEditor()!;
      if (id === 'cut') {
        await system.cut();
      } else if (id === 'copy') {
        await system.copy();
      } else if (id === 'paste') {
        setTimeout(system.paste, 11);
      } else if (id === 'select-all') {
        setTimeout(system.selectAll, 11);
      } else if (id === 'undo') {
        e.undo();
      } else if (id === 'redo') {
        e.redo();
      } else if (id === 'text-bold') {
        commands.toggleStrongCommand(e.editor);
      } else if (id === 'text-italic') {
        commands.toggleItalicCommand(e.editor);
      } else if (id === 'text-underline') {
        commands.toggleStrikethroughCommand(e.editor);
      } else if (id === 'text-highlight') {
        commands.toggleHighlightCommand(e.editor);
      } else if (id === 'text-code') {
        commands.toggleInlineCodeCommand(e.editor);
      } else if (id === 'text-clear') {
        commands.clearAllTextFormattingCommand(e.editor);
      } else if (id === 'paragraph-h1') {
        commands.setHeading1Command(e.editor);
      } else if (id === 'paragraph-h2') {
        commands.setHeading2Command(e.editor);
      } else if (id === 'paragraph-h3') {
        commands.setHeading3Command(e.editor);
      } else if (id === 'paragraph-h4') {
        commands.setHeading4Command(e.editor);
      } else if (id === 'paragraph-h5') {
        commands.setHeading5Command(e.editor);
      } else if (id === 'paragraph-h6') {
        commands.setHeading6Command(e.editor);
      } else if (id === 'paragraph-text') {
        commands.setParagraphCommand(e.editor);
      } else if (id === 'paragraph-unordered-list') {
        commands.toggleUnorderedListCommand(e.editor);
      } else if (id === 'paragraph-ordered-list') {
        commands.toggleOrderedListCommand(e.editor);
      } else if (id === 'paragraph-task-list') {
        commands.toggleTaskListCommand(e.editor);
      } else if (id === 'paragraph-blockquote') {
        commands.toggleBlockquoteCommand(e.editor);
      }
    },
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    editor.getEditor()?.setReadonly(readOnly || false);
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getEditor() {
      return editor.getEditor();
    },
    setValue(content, useHistory) {
      if (!editor) return;
      editor.getEditor()?.setValue(content, { useHistory, scrollToTop: true });
    },
    getValue() {
      if (!editor) return null;
      return editor.getEditor()?.getValue() || null;
    },
  }));

  return (
    <>
      <div ref={editorRootRef} style={style} className={clsx('cm6-theme', className)}></div>
    </>
  );
});
