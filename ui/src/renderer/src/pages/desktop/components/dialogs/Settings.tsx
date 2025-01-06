import { Heading } from '@chakra-ui/react';
import React, { useState } from 'react';
import { create } from 'zustand';

import { ColorModeSelect } from '@/components';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  TabType,
  Tabs,
  TabsContent,
} from '@/components/ui';
import { useWorkspaceStore } from '@/models/workspace';

import styles from './Settings.module.scss';

export interface SettingsProps {}

export interface SettingsStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useSettings = create<SettingsStore>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));

const settingsTabs: TabType[] = [
  {
    value: 'globalSettings',
    title: '全局设置',
  },
  {
    value: 'workspaceSettings',
    title: '工作区设置',
  },
  {
    value: 'appearance',
    title: '外观',
  },
];

const GlobalSettings = () => {
  return <div className={styles.globalSettings}></div>;
};

const WorkspaceSettings = () => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  return (
    <div className={styles.workspaceSettings}>
      {currentWorkspace == null ? <Heading size="sm">没有打开工作区</Heading> : <div></div>}
    </div>
  );
};

const AppearanceSettings = () => {
  return (
    <div className={styles.appearanceSettings}>
      <div className={styles.rowSettings}>
        <div>颜色模式：</div>
        <ColorModeSelect size="sm" width="1/2" />
      </div>
    </div>
  );
};

export const Settings: React.FC<SettingsProps> = () => {
  const store = useSettings();
  const [tabValue, setTabValue] = useState(settingsTabs[0].value);
  return (
    <DialogRoot
      size="cover"
      placement="center"
      motionPreset="scale"
      closeOnInteractOutside={false}
      open={store.isOpen}
      onOpenChange={(v) => store.setIsOpen(v.open)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <div className={styles.settings}>
            <Tabs
              className={styles.settingsTabs}
              triggerListProps={{
                className: styles.settingsTabsTriggerList,
              }}
              orientation="vertical"
              tabs={settingsTabs}
              value={tabValue}
              onValueChange={(v) => setTabValue(v.value)}
            >
              <TabsContent className={styles.settingsContentWrap} value="globalSettings">
                <GlobalSettings />
              </TabsContent>
              <TabsContent className={styles.settingsContentWrap} value="workspaceSettings">
                <WorkspaceSettings />
              </TabsContent>
              <TabsContent className={styles.settingsContentWrap} value="appearance">
                <AppearanceSettings />
              </TabsContent>
            </Tabs>
          </div>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};
