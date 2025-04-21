import { Button, Text } from '@radix-ui/themes';
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
  setCurrentEditFile,
  setCurrentEditorState,
  updateContent,
  updateContentAutoSave,
  useEditor,
} from '@/controller/editor';
import { EditorState, defaultEditorBackEnd, defaultEditorMode } from '@/models/editor';
import { utils } from '@/utils';

import './Editor.scss';
import { CodeMirrorEditor, CodeMirrorEditorRef, isSupportLanguage } from './codemirror';
import { ImageView, isSupportImageView } from './image';
import { MarkdownEditor, MarkdownEditorRef, isSupportMarkdown } from './markdown';
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
  const editorMode = useEditor((s) => s.editorMode) || defaultEditorMode;
  const editorBackEnd = useEditor((s) => s.editorBackEnd) || defaultEditorBackEnd;
  const editorRef = useRef<CodeMirrorEditorRef>(null);
  const mdEditorRef = useRef<MarkdownEditorRef>(null);
  const fullPath = useMemo(
    () => path.join(currentWorkspace.metadata.path, file),
    [file, currentWorkspace],
  );
  const [initContent, setInitContent] = useState<string | null>(null);
  const { uploadImagePath, uploadAttachmentPath } = useMemo(() => {
    return {
      uploadImagePath: currentWorkspace.settings.uploadImagePath,
      uploadAttachmentPath: currentWorkspace.settings.uploadAttachmentPath,
    };
  }, [currentWorkspace]);
  const folderPath = useMemo(() => path.dirname(fullPath), [fullPath]);
  const state = useMemo(() => {
    const isSupportMdEditor = isSupportMarkdown(path.basename(file));
    const isSupportEditor = isSupportLanguage(path.basename(file));
    const isSupportImage = isSupportImageView(path.basename(file));
    const isSupportVideo = isSupportVideoView(path.basename(file));
    return {
      isSupportMdEditor,
      isSupportEditor,
      isSupportImage,
      isSupportVideo,
    };
  }, [file]);
  const isCodeMirror = useMemo(() => editorMode === 'source' && !readOnly, [editorMode, readOnly]);
  useEffect(() => {
    if (!state.isSupportEditor && !state.isSupportMdEditor) {
      setCurrentEditorState(null);
    }
  }, [state.isSupportEditor, state.isSupportMdEditor]);
  useLayoutEffect(() => {
    console.log('reinit', file);
    setInitContent(null);
    if (state.isSupportEditor || state.isSupportMdEditor) {
      const filePath = fullPath;
      fs.readToString(filePath)
        .then((content) => {
          try {
            updateContent({ content: content || '' });
            setInitContent(content || '');
          } catch (e) {
            toast.error(`setValue失败: ${e}`);
          }
          // console.log('content read finish');
        })
        .catch((e) => {
          console.error('读取文件失败', filePath, e);
          toast.error(`读取文件失败: ${filePath}, ${e.message}`);
          updateContent({ content: '' });
          setInitContent('');
        });
    } else {
      updateContent(null);
      setInitContent(null);
    }
  }, [file, fullPath, editorBackEnd, editorMode]);

  const saveFile = useCallback((content: string) => {
    saveContent(content);
  }, []);

  const getEditorValue = useCallback(() => {
    if (state.isSupportMdEditor && !isCodeMirror) {
      if (mdEditorRef.current) {
        return mdEditorRef.current.getValue();
      }
    } else if (state.isSupportEditor) {
      if (editorRef.current) {
        return editorRef.current.getValue();
      }
    }
    return null;
  }, [editorRef, mdEditorRef, state, isCodeMirror]);

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
          setCurrentEditFile(relPath);
        } else {
          toast.error(`不存在文件: ${fullPath}`);
        }
      });
    },
    [file, folderPath],
  );

  return (
    <div id="editor-root" style={style} className={className}>
      {state.isSupportMdEditor && !isCodeMirror ? (
        initContent && (
          <MarkdownEditor
            ref={mdEditorRef}
            initValue={initContent}
            editorBackEnd={editorBackEnd}
            workspaceRootPath={currentWorkspace.metadata.path}
            defaultUploadPath={uploadImagePath}
            defaultUploadAttachmentPath={uploadAttachmentPath}
            mediaRootPath={folderPath}
            editorId="markdown-editor"
            className="markdown-editor"
            filePath={file}
            readOnly={readOnly}
            editMode={editorMode}
            onSave={saveFile}
            onUpdateStateListener={setCurrentEditorState}
            onUpdate={onUpdate}
            onClickAnyLink={onClickAnyLink}
          />
        )
      ) : state.isSupportEditor ? (
        initContent && (
          <CodeMirrorEditor
            ref={editorRef}
            initValue={initContent}
            filePath={file}
            className="codemirror-editor"
            readOnly={readOnly}
            onSave={saveFile}
            onUpdateStateListener={setCurrentEditorState}
            onUpdate={onUpdate}
          />
        )
      ) : state.isSupportImage ? (
        <ImageView imgPath={fullPath} />
      ) : state.isSupportVideo ? (
        <VideoView videoPath={fullPath} />
      ) : (
        <NotSupportEditorContent filePath={fullPath} />
      )}
    </div>
  );
}
