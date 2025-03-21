import clsx from 'clsx';
import path from 'path-browserify-esm';
import { useState } from 'react';
import { toast } from 'react-toastify';

import { FileNode, Workspace, fs } from '@/bindings/api';
import { useEffect } from '@/hooks';

import styles from './Editor.module.scss';

export interface EditorProps {
  file: FileNode;
  currentWorkspace: Workspace;
}

export default function Editor(props: EditorProps) {
  const [loadContentFinish, setLoadContentFinish] = useState(false);
  // const [content, setContent] = useState('');
  const updateContent = async (setContent: (content: string) => void | undefined) => {
    if (!setContent) return;
    setLoadContentFinish(false);
    const filePath = path.join(props.currentWorkspace.metadata.path, props.file.path);
    try {
      const content = await fs.readToString(filePath);
      setContent(content);
      setLoadContentFinish(true);
    } catch (e: any) {
      console.error('读取文件失败', e);
      toast.error(`读取文件失败: ${e.message}`);
    }
  };
  // useEffect(() => updateContent(vd.setContent), [props.file, props.currentWorkspace]);

  const saveFile = async () => {
    // if (!loadContentFinish) return;
    // const content = vd?.getValue() || '';
    // const filePath = path.join(props.currentWorkspace.metadata.path, props.file.path);
    // try {
    //   fs.write(filePath, content);
    //   toast.success('保存文件成功');
    // } catch (e: any) {
    //   console.error('保存文件失败', e);
    //   toast.error(`保存文件失败: ${e.message}`);
    // }
  };
  return (
    <div className={styles.editorRoot}>
      {
        //   <div
        //   id="vditor"
        //   className={clsx('vditor', styles.editor)}
        //   onKeyDown={(e) => {
        //     if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        //       e.preventDefault();
        //       saveFile();
        //     }
        //   }}
        // />
      }
    </div>
  );
}
