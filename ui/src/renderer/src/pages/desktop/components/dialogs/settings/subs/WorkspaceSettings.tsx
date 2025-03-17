import { Text, TextField } from '@radix-ui/themes';
import { useEffect, useState } from 'react';

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
        <div>没有打开工作区</div>
      ) : (
        <>
          <div className={styles.rowSettings}>
            <Text as="div" size="2" className={styles.rowSettingsLeft}>
              名字：
            </Text>
            <div className={styles.rowSettingsRight}>
              <TextField.Root
                style={{ width: '100%' }}
                readOnly
                spellCheck="false"
                placeholder="工作区名字"
                value={workspaceName}
                onChange={(e) => {
                  setWorkspaceName(e.target.value);
                }}
              />
            </div>
          </div>
          <div className={styles.rowSettings}>
            <Text as="div" size="2" className={styles.rowSettingsLeft}>
              路径：
            </Text>
            <div className={styles.rowSettingsRight}>
              <TextField.Root
                style={{ width: '100%' }}
                readOnly
                spellCheck="false"
                placeholder="工作区路径"
                value={workspacePath}
                onChange={(e) => {
                  setWorkspacePath(e.target.value);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
