import { Text } from '@radix-ui/themes';
import { useParams } from 'react-router';

import { Breadcrumb } from '@/components/Breadcrumb';
import Editor from '@/components/editor/Editor';
import { workspaceController } from '@/controller/workspace';

import styles from './Index.module.scss';

const EmptyIndex = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
      }}
    >
      <Text as="div" size="4">
        没有打开文件
      </Text>
    </div>
  );
};

const EmptyWorkspaceIndex = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
      }}
    >
      <Text as="div" size="4">
        没有打开工作区
      </Text>
    </div>
  );
};

const TopToolbar = ({ filePath }: { filePath: string }) => {
  return (
    <div className={styles.editorTopToolbar}>
      <div className={styles.editorTopToolbarLeft}>前进/后退</div>
      <div className={styles.editorTopToolbarCenter}>
        <Breadcrumb.Lazy
          path={filePath}
          onItemClick={(path) => {
            console.log(path);
          }}
        />
      </div>
      <div className={styles.editorTopToolbarRight}>功能按钮</div>
    </div>
  );
};

export default function Index() {
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
  const { file } = useParams();
  const filePath = file ? decodeURIComponent(file) : null;
  return (
    <div className={styles.indexRoot}>
      {currentWorkspace == null ? (
        <EmptyWorkspaceIndex />
      ) : filePath == null ? (
        <EmptyIndex />
      ) : (
        <div className={styles.editorRoot}>
          <TopToolbar filePath={filePath} />
          <Editor file={filePath} currentWorkspace={currentWorkspace} />
        </div>
      )}
    </div>
  );
}
