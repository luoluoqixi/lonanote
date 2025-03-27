import { Button, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import path from 'path-browserify-esm';
import { CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';

import { Workspace, fs } from '@/bindings/api';
import { setCurrentEditorState } from '@/controller/editor';
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
  file,
  currentWorkspace,
  readOnly,
  className,
  style,
}: EditorProps) {
  const editorRef = useRef<CodeMirrorEditorRef>(null);
  const mdEditorRef = useRef<MarkdownEditorRef>(null);
  const fullPath = useMemo(
    () => path.join(currentWorkspace.metadata.path, file),
    [file, currentWorkspace],
  );
  const state = useMemo(() => {
    const fileName = path.basename(file);
    const isSupportMdEditor = isSupportMarkdown(path.basename(file));
    const isSupportEditor = isSupportLanguage(path.basename(file));
    const isSupportImage = isSupportImageView(path.basename(file));
    const isSupportVideo = isSupportVideoView(path.basename(file));
    return {
      fileName,
      isSupportMdEditor,
      isSupportEditor,
      isSupportImage,
      isSupportVideo,
    };
  }, [file]);
  useEffect(() => {
    if (!state.isSupportEditor && !state.isSupportMdEditor) {
      setCurrentEditorState(null);
    }
  }, [state.isSupportEditor, state.isSupportMdEditor]);
  useLayoutEffect(() => {
    if (state.isSupportEditor || state.isSupportMdEditor) {
      const filePath = path.join(currentWorkspace.metadata.path, file);
      fs.readToString(filePath)
        .then((content) => {
          if (state.isSupportEditor && editorRef.current) {
            editorRef.current.setValue(content);
          } else if (state.isSupportMdEditor && mdEditorRef.current) {
            mdEditorRef.current.setValue(content);
          }
          // console.log('content read finish');
        })
        .catch((e) => {
          console.error('读取文件失败', filePath, e);
          toast.error(`读取文件失败: ${filePath}, ${e.message}`);
        });
    }
  }, [file, currentWorkspace]);

  const saveFile = useCallback(
    (content: string) => {
      if (content == null) return;
      fs.write(fullPath, content)
        .then(() => {
          toast.success('保存文件成功');
        })
        .catch((e) => {
          console.error('保存文件失败', e);
          toast.error(`保存文件失败: ${e.message}`);
        });
    },
    [fullPath],
  );

  return (
    <div style={style} className={clsx('editor-root', className)}>
      {state.isSupportMdEditor ? (
        <MarkdownEditor
          ref={mdEditorRef}
          fileName={state.fileName}
          className="markdown-editor"
          readOnly={readOnly}
          onSave={saveFile}
          onUpdateListener={setCurrentEditorState}
        />
      ) : state.isSupportEditor ? (
        <CodeMirrorEditor
          ref={editorRef}
          fileName={state.fileName}
          className="codemirror-editor"
          readOnly={readOnly}
          onSave={saveFile}
          onUpdateListener={setCurrentEditorState}
        />
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
