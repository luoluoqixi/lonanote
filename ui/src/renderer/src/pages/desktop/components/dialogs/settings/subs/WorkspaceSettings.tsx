import { useEffect, useState } from 'react';

import { Editable, Heading, toaster } from '@/components/ui';
import {
  setCurrentWorkspaceName,
  setCurrentWorkspacePath,
  useWorkspace,
} from '@/controller/workspace';

import { BaseSettingsPanelProps } from '../Settings';
import styles from '../Settings.module.scss';

export interface WorkspaceSettingsProps extends BaseSettingsPanelProps {}
export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = () => {
  const currentWorkspace = useWorkspace((s) => s.currentWorkspace);
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.metadata.name);
  const [workspacePath, setWorkspacePath] = useState(currentWorkspace?.metadata.path);

  useEffect(() => {
    setWorkspaceName(currentWorkspace?.metadata.name);
    setWorkspacePath(currentWorkspace?.metadata.path);
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
              <Editable
                spellCheck={false}
                placeholder="工作区名字"
                value={workspaceName}
                onValueChange={(e) => {
                  setWorkspaceName(e.value);
                }}
                onValueCommit={async (details) => {
                  const value = details.value != null ? details.value.trim() : null;
                  if (value != null && value !== '' && value !== currentWorkspace.metadata.name) {
                    try {
                      await setCurrentWorkspaceName(value, true);
                    } catch (e) {
                      console.error(e);
                      toaster.error({
                        title: '错误',
                        description: `修改工作区名字失败: ${(e as Error).message}`,
                        duration: 10000,
                      });
                      setWorkspaceName(currentWorkspace.metadata.name);
                    }
                  } else {
                    setWorkspaceName(currentWorkspace.metadata.name);
                  }
                }}
              />
            </div>
          </div>
          <div className={styles.rowSettings}>
            <div className={styles.rowSettingsLeft}>路径：</div>
            <div className={styles.rowSettingsRight}>
              <Editable
                spellCheck={false}
                placeholder="工作区路径"
                value={workspacePath}
                onValueChange={(e) => {
                  setWorkspacePath(e.value);
                }}
                onValueCommit={async (details) => {
                  const value = details.value != null ? details.value.trim() : null;
                  if (value != null && value !== '' && value !== currentWorkspace.metadata.path) {
                    try {
                      await setCurrentWorkspacePath(value, true);
                    } catch (e) {
                      console.error(e);
                      toaster.error({
                        title: '错误',
                        description: `修改工作区路径失败: ${(e as Error).message}`,
                        duration: 10000,
                      });
                      setWorkspacePath(currentWorkspace.metadata.path);
                    }
                  } else {
                    setWorkspacePath(currentWorkspace.metadata.path);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
