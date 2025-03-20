import clsx from 'clsx';
import path from 'path-browserify-esm';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Vditor from 'vditor';

import { FileNode, Workspace, fs } from '@/bindings/api';
import { useEffect } from '@/hooks';

import styles from './Editor.module.scss';

export interface EditorProps {
  file: FileNode;
  currentWorkspace: Workspace;
}

export default function Editor(props: EditorProps) {
  const [vd, setVd] = useState<Vditor>();
  const [loadContentFinish, setLoadContentFinish] = useState(false);
  // const [content, setContent] = useState('');
  useEffect(() => {
    const vditor = new Vditor('vditor', {
      after: () => {
        vditor.setValue('');
        setVd(vditor);
      },
      cdn: '/libs/vditor',
      theme: 'classic',
      mode: 'ir',
      toolbar: [],
    });
    // Clear the effect
    return () => {
      vd?.destroy();
      setVd(undefined);
    };
  }, []);
  useEffect(async () => {
    setLoadContentFinish(false);
    const filePath = path.join(props.currentWorkspace.metadata.path, props.file.path);
    try {
      const content = await fs.readToString(filePath);
      // setContent(content);
      vd?.setValue(content);
      setLoadContentFinish(true);
    } catch (e: any) {
      console.error('读取文件失败', e);
      toast.error(`读取文件失败: ${e.message}`);
    }
  }, [props.file, props.currentWorkspace]);

  const saveFile = async () => {
    if (!loadContentFinish) return;
    const content = vd?.getValue() || '';
    const filePath = path.join(props.currentWorkspace.metadata.path, props.file.path);

    try {
      fs.write(filePath, content);
      toast.success('保存文件成功');
    } catch (e: any) {
      console.error('保存文件失败', e);
      toast.error(`保存文件失败: ${e.message}`);
    }
  };
  return (
    <div className={styles.editorRoot}>
      <div
        id="vditor"
        className={clsx('vditor', styles.editor)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveFile();
          }
        }}
      />
    </div>
  );
}
