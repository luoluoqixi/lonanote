import { Button, Text } from '@radix-ui/themes';
import {
  CodeMirrorEditor,
  CodeMirrorEditorRef,
  isSupportCodeMirrorLanguage,
} from 'lonanote-editor';
import path from 'path-browserify-esm';
import {
  CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import { Workspace, fs } from '@/bindings/api';
import {
  saveContent,
  saveDirtyFocus,
  setCurrentEditFileIf,
  setCurrentEditorState,
  updateContent,
  updateContentAutoSave,
  useEditorData,
} from '@/controller/editor';
import { utils } from '@/utils';

import './Editor.scss';
import { ImageView, isSupportImageView } from './image';
import { MarkdownEditor, MarkdownEditorRef, isSupportMarkdown } from './markdown';
import { defaultEditorMode } from './types';
import { VideoView, isSupportVideoView } from './video';

export interface EditorProps {
  className?: string;
  style?: CSSProperties;
  file: string;
  currentWorkspace: Workspace;
  readOnly?: boolean;
}

const NotSupportEditorContent = ({ filePath }: { filePath: string }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        gap: '4px',
      }}
    >
      <Text as="div" size="4">
        不支持的文件类型
      </Text>
      <Button size="2" onClick={() => utils.openFile(filePath)}>
        使用系统默认程序打开文件
      </Button>
    </div>
  );
};

export default function Editor({
  className,
  currentWorkspace,
  file,
  readOnly,
  style,
}: EditorProps) {
  const editorMode = useEditorData((s) => s.editorMode) || defaultEditorMode;
  const editorRef = useRef<CodeMirrorEditorRef>(null);
  const mdEditorRef = useRef<MarkdownEditorRef>(null);
  const { fullPath, folderPath, uploadImagePath, uploadAttachmentPath } = useMemo(() => {
    const fullPath = path.join(currentWorkspace.metadata.path, file);
    const folderPath = path.dirname(fullPath);
    return {
      fullPath,
      folderPath,
      uploadImagePath: currentWorkspace.settings.uploadImagePath,
      uploadAttachmentPath: currentWorkspace.settings.uploadAttachmentPath,
    };
  }, [file, currentWorkspace]);
  const [initContent, setInitContent] = useState<string | null>(null);
  const state = useMemo(() => {
    let isMdEditor = isSupportMarkdown(path.basename(file));
    let isCMEditor = isSupportCodeMirrorLanguage(path.basename(file));
    const isImage = isSupportImageView(path.basename(file));
    const isVideo = isSupportVideoView(path.basename(file));
    if (editorMode === 'source' && !readOnly) {
      isMdEditor = false;
      isCMEditor = true;
    }
    return {
      isEditor: isMdEditor || isCMEditor,
      isMdEditor,
      isCMEditor,
      isImage,
      isVideo,
    };
  }, [file, editorMode, readOnly]);
  useEffect(() => {
    if (!state.isEditor) {
      setCurrentEditorState(null);
    }
  }, [state]);
  useLayoutEffect(() => {
    setInitContent(null);
    updateContent(null);
    if (state.isEditor) {
      const filePath = fullPath;
      fs.readToString(filePath)
        .then((content) => {
          try {
            updateContent(content || '');
            setInitContent(content || '');
          } catch (e) {
            toast.error(`setValue失败: ${e}`);
          }
          // console.log('content read finish');
        })
        .catch((e) => {
          console.error('读取文件失败', filePath, e);
          toast.error(`读取文件失败: ${filePath}, ${e.message}`);
          updateContent('');
          setInitContent('');
        });
    } else {
      updateContent(null);
      setInitContent(null);
    }
  }, [fullPath, editorMode]);

  const saveFile = useCallback((content: string) => {
    saveContent(content, true);
  }, []);

  const onFocusChange = useCallback((focus: boolean) => {
    if (!focus) {
      saveDirtyFocus();
    }
  }, []);

  const getEditorValue = useCallback(() => {
    if (state.isMdEditor) {
      if (mdEditorRef.current) {
        return mdEditorRef.current.getValue();
      }
    } else if (state.isCMEditor) {
      if (editorRef.current) {
        return editorRef.current.getValue();
      }
    }
    return null;
  }, [editorRef, mdEditorRef, state.isCMEditor, state.isMdEditor]);

  const onUpdate = useCallback(() => {
    updateContentAutoSave(getEditorValue);
  }, [getEditorValue]);

  const onClickAnyLink = useCallback(
    (link: string) => {
      if (link == null) return;
      if (utils.isImgUrl(link)) {
        window.open(link);
        return;
      }
      const relPath = utils.getFilePathFromRelativePath(file, link);
      const absPath = utils.getFilePathFromRelativePath(fullPath, link);
      fs.exists(absPath).then((exists) => {
        if (exists) {
          console.log(relPath, absPath);
          setCurrentEditFileIf(relPath);
        } else {
          toast.error(`不存在文件: ${fullPath}`);
        }
      });
    },
    [file, folderPath],
  );

  return (
    <div id="editor-root" style={style} className={className}>
      {state.isMdEditor ? (
        initContent != null && (
          <MarkdownEditor
            ref={mdEditorRef}
            initValue={initContent}
            workspaceRootPath={currentWorkspace.metadata.path}
            defaultUploadPath={uploadImagePath}
            defaultUploadAttachmentPath={uploadAttachmentPath}
            mediaRootPath={folderPath}
            editorId="markdown-editor"
            className="markdown-editor"
            filePath={file}
            readOnly={readOnly}
            editMode={editorMode}
            onFocusChange={onFocusChange}
            onSave={saveFile}
            onUpdateStateListener={setCurrentEditorState}
            onUpdate={onUpdate}
            onClickAnyLink={onClickAnyLink}
          />
        )
      ) : state.isCMEditor ? (
        initContent != null && (
          <CodeMirrorEditor
            ref={editorRef}
            initValue={initContent}
            filePath={file}
            className="codemirror-editor"
            readOnly={readOnly}
            onSave={saveFile}
            onFocusChange={onFocusChange}
            onUpdateStateListener={setCurrentEditorState}
            onUpdate={onUpdate}
          />
        )
      ) : state.isImage ? (
        <ImageView imgPath={fullPath} />
      ) : state.isVideo ? (
        <VideoView videoPath={fullPath} />
      ) : (
        <NotSupportEditorContent filePath={fullPath} />
      )}
    </div>
  );
}
