import { HStack, Heading, parseColor } from '@chakra-ui/react';
import React, { useRef, useState } from 'react';
import { RiResetLeftLine } from 'react-icons/ri';
import { create } from 'zustand';

import { ColorModeSelect } from '@/components';
import {
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerControl,
  ColorPickerEyeDropper,
  ColorPickerInput,
  ColorPickerRoot,
  ColorPickerSliders,
  ColorPickerTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  IconButton,
  TabType,
  Tabs,
  TabsContent,
  Tooltip,
} from '@/components/ui';
import { defaultAppearanceColor, useSettingsStore, useWorkspaceStore } from '@/models';

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

interface BaseSettingsPanelProps {
  contentRef: React.Ref<HTMLDivElement>;
}

interface GlobalSettingsProps extends BaseSettingsPanelProps {}

const GlobalSettings: React.FC<GlobalSettingsProps> = () => {
  return <div className={styles.globalSettings}></div>;
};
interface WorkspaceSettingsProps extends BaseSettingsPanelProps {}
const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = () => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  return (
    <div className={styles.workspaceSettings}>
      {currentWorkspace == null ? <Heading size="sm">没有打开工作区</Heading> : <div></div>}
    </div>
  );
};

interface AppearanceSettingsProps extends BaseSettingsPanelProps {}
const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ contentRef }) => {
  const appearanceSettings = useSettingsStore((s) => s.appearanceSettings);
  const color = appearanceSettings?.color || defaultAppearanceColor;
  return (
    <div className={styles.appearanceSettings}>
      <div className={styles.rowSettings}>
        <div className={styles.rowSettingsLeft}>颜色模式：</div>
        <div className={styles.rowSettingsRight}>
          <ColorModeSelect width="100%" contentRef={contentRef} size="sm" />
        </div>
      </div>
      <div className={styles.rowSettings}>
        <div className={styles.rowSettingsLeft}>颜色：</div>
        <div className={styles.rowSettingsRight}>
          <ColorPickerRoot
            width="100%"
            size="sm"
            value={parseColor(color)}
            onValueChange={(v) => useSettingsStore.getState().setAppearanceColor(v.valueAsString)}
          >
            <ColorPickerControl>
              <ColorPickerInput />
              <ColorPickerTrigger />
              <Tooltip content="重置" positioning={{ placement: 'top' }}>
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    useSettingsStore.getState().setAppearanceColor(defaultAppearanceColor)
                  }
                >
                  <RiResetLeftLine />
                </IconButton>
              </Tooltip>
            </ColorPickerControl>
            <ColorPickerContent portalRef={contentRef}>
              <ColorPickerArea />
              <HStack>
                <ColorPickerEyeDropper />
                <ColorPickerSliders />
              </HStack>
            </ColorPickerContent>
          </ColorPickerRoot>
        </div>
      </div>
    </div>
  );
};

export const Settings: React.FC<SettingsProps> = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const store = useSettings();
  const [tabValue, setTabValue] = useState(settingsTabs[0].value);
  return (
    <DialogRoot
      size="cover"
      placement="center"
      motionPreset="scale"
      closeOnInteractOutside
      open={store.isOpen}
      onOpenChange={(v) => store.setIsOpen(v.open)}
    >
      <DialogContent ref={contentRef}>
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
                <GlobalSettings contentRef={contentRef} />
              </TabsContent>
              <TabsContent className={styles.settingsContentWrap} value="workspaceSettings">
                <WorkspaceSettings contentRef={contentRef} />
              </TabsContent>
              <TabsContent className={styles.settingsContentWrap} value="appearance">
                <AppearanceSettings contentRef={contentRef} />
              </TabsContent>
            </Tabs>
          </div>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};
