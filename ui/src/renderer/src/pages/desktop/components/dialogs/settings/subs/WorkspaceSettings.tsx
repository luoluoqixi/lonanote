import { useEffect, useState } from 'react';

import { Editable, Heading } from '@/components/ui';
import { useWorkspace } from '@/controller/workspace';

import { BaseSettingsPanelProps } from '../Settings';
import styles from '../Settings.module.scss';

export interface WorkspaceSettingsProps extends BaseSettingsPanelProps {}
export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = () => {
  const currentWorkspace = useWorkspace((s) => s.currentWorkspace);
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.metadata.name);
  const [workspacePath, setWorkspacePath] = useState(currentWorkspace?.metadata.rootPath);

  useEffect(() => {
    setWorkspaceName(currentWorkspace?.metadata.name);
    setWorkspacePath(currentWorkspace?.metadata.rootPath);
  }, [currentWorkspace]);

  // const setWorkspaceNameCommit = async (value: string | null) => {
  //   if (currentWorkspace == null) return;
  //   if (value != null && value !== '' && value !== currentWorkspace.metadata.name) {
  //     try {
  //       await setCurrentWorkspaceName(value, true);
  //     } catch (e) {
  //       console.error(e);
  //       toaster.error({
  //         title: '错误',
  //         description: `修改工作区名字失败: ${(e as Error).message}`,
  //         duration: 10000,
  //       });
  //       setWorkspaceName(currentWorkspace.metadata.name);
  //     }
  //   } else {
  //     setWorkspaceName(currentWorkspace.metadata.name);
  //   }
  // };

  // const setWorkspacePathCommit = async (value: string | null) => {
  //   if (currentWorkspace == null) return;
  //   if (value != null && value !== '' && value !== currentWorkspace.metadata.rootPath) {
  //     try {
  //       await setCurrentWorkspaceRootPath(value, true);
  //     } catch (e) {
  //       console.error(e);
  //       toaster.error({
  //         title: '错误',
  //         description: `修改工作区路径失败: ${(e as Error).message}`,
  //         duration: 10000,
  //       });
  //       setWorkspacePath(currentWorkspace.metadata.rootPath);
  //     }
  //   } else {
  //     setWorkspacePath(currentWorkspace.metadata.rootPath);
  //   }
  // };

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
                showEditBtn={false}
                previewProps={{ pointerEvents: 'none' }}
                placeholder="工作区名字"
                value={workspaceName}
                onValueChange={(e) => {
                  setWorkspaceName(e.value);
                }}
                // onValueCommit={async (details) => {
                //   const value = details.value != null ? details.value.trim() : null;
                //   setWorkspaceNameCommit(value);
                // }}
              />
            </div>
          </div>
          <div className={styles.rowSettings}>
            <div className={styles.rowSettingsLeft}>路径：</div>
            <div className={styles.rowSettingsRight}>
              <Editable
                spellCheck={false}
                showEditBtn={false}
                previewProps={{ pointerEvents: 'none' }}
                placeholder="工作区路径"
                value={workspacePath}
                onValueChange={(e) => {
                  setWorkspacePath(e.value);
                }}
                // onValueCommit={async (details) => {
                //   const value = details.value != null ? details.value.trim() : null;
                //   setWorkspacePathCommit(value);
                // }}
                // customRightSlotRender={(edit) =>
                //   !edit && (
                //     <IconButton
                //       variant="ghost"
                //       size="sm"
                //       onClick={async () => {
                //         const selectPath = await dialog.showOpenFolderDialog('选择文件夹');
                //         if (selectPath && selectPath !== '') {
                //           setWorkspacePathCommit(selectPath);
                //         }
                //       }}
                //     >
                //       <IoIosMore />
                //     </IconButton>
                //   )
                // }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
