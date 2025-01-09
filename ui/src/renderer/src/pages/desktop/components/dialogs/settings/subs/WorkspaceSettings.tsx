import { Heading } from '@chakra-ui/react';
import { useState } from 'react';

import { Editable } from '@/components/ui';
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
                onFinish={() => {
                  if (workspaceName != null && workspaceName !== currentWorkspace.metadata.name) {
                    setCurrentWorkspaceName(workspaceName);
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
