import React, { useRef, useState } from 'react';
import { RiResetLeftLine } from 'react-icons/ri';
import { create } from 'zustand';

import { Dialog, IconButton, IconButtonProps, TabType, Tabs, Tooltip } from '@/components/ui';

import styles from './Settings.module.scss';
import { AppearanceSettings } from './subs/AppearanceSettings';
import { GlobalSettings } from './subs/GlobalSettings';
import { WorkspaceSettings } from './subs/WorkspaceSettings';

export interface SettingsProps {}

export interface SettingsStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useSettingsState = create<SettingsStore>((set) => ({
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

interface ResetButtonProps extends IconButtonProps {}

export const ResetButton: React.FC<ResetButtonProps> = (props) => {
  return (
    <Tooltip content="重置" positioning={{ placement: 'top' }}>
      <IconButton size="sm" variant="ghost" {...props}>
        <RiResetLeftLine />
      </IconButton>
    </Tooltip>
  );
};

export interface BaseSettingsPanelProps {
  contentRef: React.Ref<HTMLDivElement>;
}

export const Settings: React.FC<SettingsProps> = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const state = useSettingsState();
  const [tabValue, setTabValue] = useState(settingsTabs[0].value);
  return (
    <Dialog.Root
      size="cover"
      placement="center"
      motionPreset="scale"
      closeOnInteractOutside
      open={state.isOpen}
      onOpenChange={(v) => state.setIsOpen(v.open)}
    >
      <Dialog.Content ref={contentRef}>
        <Dialog.Header>
          <Dialog.Title>设置</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body overflow="auto">
          <div className={styles.settings}>
            <Tabs.Wrap
              className={styles.settingsTabs}
              triggerListProps={{
                className: styles.settingsTabsTriggerList,
              }}
              orientation="vertical"
              tabs={settingsTabs}
              value={tabValue}
              onValueChange={(v) => setTabValue(v.value)}
            >
              <Tabs.Content className={styles.settingsContentWrap} value="globalSettings">
                <GlobalSettings contentRef={contentRef} />
              </Tabs.Content>
              <Tabs.Content className={styles.settingsContentWrap} value="workspaceSettings">
                <WorkspaceSettings contentRef={contentRef} />
              </Tabs.Content>
              <Tabs.Content className={styles.settingsContentWrap} value="appearance">
                <AppearanceSettings contentRef={contentRef} />
              </Tabs.Content>
            </Tabs.Wrap>
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
