import { Button, ButtonProps, Card, Dialog, Tabs, Tooltip } from '@radix-ui/themes';
import { useState } from 'react';
import { RiResetLeftLine } from 'react-icons/ri';
import { create } from 'zustand';

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

const settingsTabs = [
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

interface ResetButtonProps extends ButtonProps {}

export const ResetButton: React.FC<ResetButtonProps> = (props) => {
  return (
    <Tooltip content="重置" side="top">
      <Button
        variant="ghost"
        style={{
          marginLeft: '5px',
          marginRight: '5px',
          padding: '8px',
        }}
        {...props}
      >
        <RiResetLeftLine />
      </Button>
    </Tooltip>
  );
};

export interface BaseSettingsPanelProps {}

export const Settings: React.FC<SettingsProps> = () => {
  const state = useSettingsState();
  const [selectedValue, setSelectedValue] = useState(settingsTabs[0].value);
  return (
    <Dialog.Root
      open={state.isOpen}
      onOpenChange={(v) => {
        if (!v) {
          state.setIsOpen(false);
        }
      }}
    >
      <Dialog.Content
        maxWidth="80vw"
        maxHeight="80vh"
        height="80vh"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <Dialog.Title>设置</Dialog.Title>
        <Dialog.Description></Dialog.Description>
        <Card
          style={{
            display: 'flex',
            padding: '10px',
            flex: 1,
            backgroundColor: 'var(--gray-1)',
          }}
        >
          <div className={styles.settings}>
            <Tabs.Root
              className={styles.settingsTabs}
              orientation="vertical"
              aria-label="SettingsTabs"
              value={selectedValue}
              onValueChange={(v) => {
                if (v) {
                  setSelectedValue(v);
                }
              }}
            >
              <Tabs.List wrap="wrap" style={{ width: '100%', boxShadow: 'none' }}>
                {settingsTabs.map((tab) => {
                  return (
                    <Tabs.Trigger
                      className={styles.settingsTabItem}
                      key={tab.value}
                      value={tab.value}
                    >
                      {tab.title}
                    </Tabs.Trigger>
                  );
                })}
              </Tabs.List>
            </Tabs.Root>
            <div className={styles.settingsContentWrap}>
              {selectedValue === 'globalSettings' && <GlobalSettings />}
              {selectedValue === 'workspaceSettings' && <WorkspaceSettings />}
              {selectedValue === 'appearance' && <AppearanceSettings />}
            </div>
          </div>
        </Card>
      </Dialog.Content>
    </Dialog.Root>
  );
};
