import { Input } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import { Editable, Heading } from '@/components/ui';
import { workspaceController } from '@/controller/workspace';

import { BaseSettingsPanelProps } from '../Settings';
import styles from '../Settings.module.scss';

export interface WorkspaceSettingsProps extends BaseSettingsPanelProps {}
export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = () => {
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.metadata.name);
  const [workspacePath, setWorkspacePath] = useState(currentWorkspace?.metadata.rootPath);

  useEffect(() => {
    setWorkspaceName(currentWorkspace?.metadata.name);
    setWorkspacePath(currentWorkspace?.metadata.rootPath);
  }, [currentWorkspace]);

  return (
    <div className={styles.workspaceSettings}>
      {currentWorkspace == null ? (
        <Heading size="sm">没有打开工作区</Heading>
      ) : (
        <div className={styles.workspaceSettings}>
          <div className={styles.rowSettings}>
            <div className={styles.rowSettingsLeft}>名字：</div>
            <div className={styles.rowSettingsRight}>
              <Input
                readOnly
                size="sm"
                variant="flushed"
                spellCheck={false}
                placeholder="工作区名字"
                value={workspaceName}
                onChange={(e) => {
                  setWorkspaceName(e.target.value);
                }}
              />
            </div>
          </div>
          <div className={styles.rowSettings}>
            <div className={styles.rowSettingsLeft}>路径：</div>
            <div className={styles.rowSettingsRight}>
              <Input
                readOnly
                size="sm"
                variant="flushed"
                spellCheck={false}
                placeholder="工作区路径"
                value={workspacePath}
                onChange={(e) => {
                  setWorkspacePath(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
