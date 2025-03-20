import { Text } from '@radix-ui/themes';

import { useEditor } from '@/controller/editor';
import { workspaceController } from '@/controller/workspace';

import styles from './Index.module.scss';
import Editor from './components/Editor';

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

export default function Index() {
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
  const currentEditFileNode = useEditor((s) => s.currentEditFileNode);
  return (
    <div className={styles.indexRoot}>
      {currentWorkspace == null ? (
        <EmptyWorkspaceIndex />
      ) : currentEditFileNode == null ? (
        <EmptyIndex />
      ) : (
        <Editor file={currentEditFileNode} currentWorkspace={currentWorkspace} />
      )}
    </div>
  );
}
