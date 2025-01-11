import { useState } from 'react';

import { Editable, Heading, toaster } from '@/components/ui';
import { setCurrentWorkspaceName, useWorkspace } from '@/controller/workspace';

import { BaseSettingsPanelProps } from '../Settings';
import styles from '../Settings.module.scss';

export interface WorkspaceSettingsProps extends BaseSettingsPanelProps {}
export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = () => {
  const currentWorkspace = useWorkspace((s) => s.currentWorkspace);
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.metadata.name);

  return (
    <div className={styles.workspaceSettings}>
      {currentWorkspace == null ? (
        <Heading size="sm">没有打开工作区</Heading>
      ) : (
        <div className={styles.workspaceSettings}>
          <div className={styles.rowSettings}>
            <div className={styles.rowSettingsLeft}>名字：</div>
            <div className={styles.rowSettingsRight}>
              <Editable
                placeholder="工作区名字"
                value={workspaceName}
                onValueChange={(e) => {
                  setWorkspaceName(e.value);
                }}
                onValueCommit={async (details) => {
                  const value = details.value;
                  if (value != null && value !== currentWorkspace.metadata.name) {
                    if (value.trim() === '') {
                      toaster.error({
                        title: '错误',
                        description: '工作区名字不能为空',
                        duration: 10000,
                      });
                      setWorkspaceName(currentWorkspace.metadata.name);
                      return;
                    }
                    try {
                      await setCurrentWorkspaceName(value);
                    } catch (e) {
                      console.error(e);
                      toaster.error({
                        title: '错误',
                        description: `修改工作区名字失败: ${(e as Error).message}`,
                        duration: 10000,
                      });
                      setWorkspaceName(currentWorkspace.metadata.name);
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className={styles.rowSettings}>
            <div className={styles.rowSettingsLeft}>路径：</div>
            <div className={styles.rowSettingsRight}>{currentWorkspace.metadata.path}</div>
          </div>
        </div>
      )}
    </div>
  );
};
