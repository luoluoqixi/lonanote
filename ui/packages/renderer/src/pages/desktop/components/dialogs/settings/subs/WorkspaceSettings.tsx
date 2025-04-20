import { Button, Flex, Switch, Text, TextArea, TextField } from '@radix-ui/themes';
import { useEffect, useState } from 'react';

import { workspaceController } from '@/controller/workspace';

import { BaseSettingsPanelProps, ResetButton } from '../Settings';
import styles from '../Settings.module.scss';

export interface WorkspaceSettingsProps extends BaseSettingsPanelProps {}
export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = () => {
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.metadata.name);
  const [workspacePath, setWorkspacePath] = useState(currentWorkspace?.metadata.rootPath);

  const [customIgnore, setCustomIgnore] = useState<string | undefined>(
    currentWorkspace?.settings.customIgnore,
  );

  useEffect(() => {
    setWorkspaceName(currentWorkspace?.metadata.name);
    setWorkspacePath(currentWorkspace?.metadata.rootPath);
    setCustomIgnore(currentWorkspace?.settings.customIgnore);
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
          <div className={styles.rowSettings}>
            <Text as="div" size="2" className={styles.rowSettingsLeft}>
              上传图片路径：
            </Text>
            <div className={styles.rowSettingsRight}>
              <TextField.Root
                style={{ width: '100%' }}
                spellCheck="false"
                placeholder="上传图片路径"
                value={currentWorkspace.settings.uploadImagePath}
                onChange={(e) => {
                  workspaceController.setWorkspaceUploadImagePath(e.target.value);
                }}
              />
              <ResetButton onClick={() => workspaceController.resetWorkspaceUploadImagePath()} />
            </div>
          </div>
          <div className={styles.rowSettings}>
            <Text as="div" size="2" className={styles.rowSettingsLeft}>
              上传附件路径：
            </Text>
            <div className={styles.rowSettingsRight}>
              <TextField.Root
                style={{ width: '100%' }}
                spellCheck="false"
                placeholder="上传附件路径"
                value={currentWorkspace.settings.uploadAttachmentPath}
                onChange={(e) => {
                  workspaceController.setWorkspaceUploadAttachmentPath(e.target.value);
                }}
              />
              <ResetButton
                onClick={() => workspaceController.resetWorkspaceUploadAttachmentPath()}
              />
            </div>
          </div>
          <div className={styles.rowSettings}>
            <Text as="div" size="2" className={styles.rowSettingsLeft}>
              历史快照数量：
            </Text>
            <div className={styles.rowSettingsRight}>
              <TextField.Root
                style={{ width: '100%' }}
                type="number"
                spellCheck="false"
                placeholder="历史快照数量"
                value={currentWorkspace.settings.histroySnapshootCount}
                onChange={(e) => {
                  const s = e.target.value;
                  const num = Number(s);
                  if (Number.isNaN(num)) {
                    return;
                  }
                  workspaceController.setWorkspaceHistroySnapshootCount(num);
                }}
              />
              <ResetButton
                onClick={() => workspaceController.resetWorkspaceHistroySnapshootCount()}
              />
            </div>
          </div>
          <div className={styles.rowSettings}>
            <Text as="div" size="2" className={styles.rowSettingsLeft}>
              使用 .gitignore 规则：
            </Text>
            <div className={styles.rowSettingsRight}>
              <Switch
                checked={currentWorkspace.settings.followGitignore}
                onCheckedChange={(v) => workspaceController.setCurrentWorkspaceFollowGitignore(v)}
              />
            </div>
          </div>
          <div
            style={{
              height: '100px',
            }}
            className={styles.rowSettings}
          >
            <Text as="div" size="2" className={styles.rowSettingsLeft}>
              自定义 ignore 规则：
            </Text>
            <div
              style={{
                height: '100px',
              }}
              className={styles.rowSettingsRight}
            >
              <Flex width="100%" height="100%" direction="column" gap="1">
                <TextArea
                  spellCheck="false"
                  style={{ height: '100%', width: '100%' }}
                  value={customIgnore}
                  onChange={(e) => setCustomIgnore(e.target.value)}
                  slot="123"
                />
                <Flex direction="row" width="100%" gap="1">
                  <Button
                    style={{ flexGrow: 1 }}
                    size="1"
                    onClick={() =>
                      workspaceController.setCurrentWorkspaceCustomIgnore(customIgnore || '')
                    }
                  >
                    保存并应用
                  </Button>
                  <ResetButton
                    size="1"
                    variant="solid"
                    style={{ margin: 0 }}
                    onClick={() => workspaceController.resetCurrentWorkspaceCustomIgnore()}
                  />
                </Flex>
              </Flex>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
