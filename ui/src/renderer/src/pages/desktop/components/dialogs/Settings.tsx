import { HStack, Heading, parseColor } from '@chakra-ui/react';
import React, { useRef, useState } from 'react';
import { RiResetLeftLine } from 'react-icons/ri';
import { create } from 'zustand';

import { path } from '@/bindings/api/path';
import { ColorModeSelect } from '@/components';
import {
  Button,
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
  IconButtonProps,
  StepperInput,
  Switch,
  TabType,
  Tabs,
  TabsContent,
  Tooltip,
} from '@/components/ui';
import { config } from '@/config';
import {
  defaultThemeColor,
  isSupportResizeWindow,
  isSupportZoom,
  resetWindowSize,
  setSettingsAutoCheckUpdate,
  setSettingsAutoOpenLastWorkspace,
  setThemeColor,
  setZoom,
  useSettings,
  useUISettings,
} from '@/controller/settings';
import { useWorkspace } from '@/controller/workspace';

import styles from './Settings.module.scss';

const isShowDevUI = false;

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

const ResetButton: React.FC<ResetButtonProps> = (props) => {
  return (
    <Tooltip content="重置" positioning={{ placement: 'top' }}>
      <IconButton size="sm" variant="ghost" {...props}>
        <RiResetLeftLine />
      </IconButton>
    </Tooltip>
  );
};

interface BaseSettingsPanelProps {
  contentRef: React.Ref<HTMLDivElement>;
}

interface GlobalSettingsProps extends BaseSettingsPanelProps {}

const GlobalSettings: React.FC<GlobalSettingsProps> = () => {
  const settings = useSettings((s) => s.settings);
  return settings ? (
    <div className={styles.globalSettings}>
      <div className={styles.rowSettings}>
        <div className={styles.rowSettingsLeft}>自动检查更新：</div>
        <div className={styles.rowSettingsRight}>
          <Switch
            size="md"
            checked={settings.autoCheckUpdate}
            onCheckedChange={(e) => setSettingsAutoCheckUpdate(e.checked)}
          />
        </div>
      </div>
      <div className={styles.rowSettings}>
        <div className={styles.rowSettingsLeft}>自动打开上次工作区：</div>
        <div className={styles.rowSettingsRight}>
          <Switch
            size="md"
            checked={settings.autoOpenLastWorkspace}
            onCheckedChange={(e) => setSettingsAutoOpenLastWorkspace(e.checked)}
          />
        </div>
      </div>
      {config.isDev && isShowDevUI && (
        <div className={styles.rowSettings}>
          <div className={styles.rowSettingsLeft}>{'配置目录(开发模式)：'}</div>
          <div className={styles.rowSettingsRight}>
            <Button
              size="sm"
              onClick={async () => {
                const dataDir = await path.getDataDir();
                console.log(dataDir);
                if (window.api) {
                  window.api.shell.openPathInFolder(dataDir);
                }
              }}
            >
              打开配置目录
            </Button>
          </div>
        </div>
      )}
    </div>
  ) : (
    <></>
  );
};
interface WorkspaceSettingsProps extends BaseSettingsPanelProps {}
const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = () => {
  const currentWorkspace = useWorkspace((s) => s.currentWorkspace);
  return (
    <div className={styles.workspaceSettings}>
      {currentWorkspace == null ? <Heading size="sm">没有打开工作区</Heading> : <div></div>}
    </div>
  );
};

interface AppearanceSettingsProps extends BaseSettingsPanelProps {}
const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ contentRef }) => {
  const settings = useUISettings();
  const themeColor = settings.themeColor;
  return (
    <div className={styles.appearanceSettings}>
      <div className={styles.rowSettings}>
        <div className={styles.rowSettingsLeft}>颜色模式：</div>
        <div className={styles.rowSettingsRight}>
          <ColorModeSelect width="100%" contentRef={contentRef} size="sm" />
        </div>
      </div>
      <div className={styles.rowSettings}>
        <div className={styles.rowSettingsLeft}>主题颜色：</div>
        <div className={styles.rowSettingsRight}>
          <ColorPickerRoot
            width="100%"
            size="sm"
            value={parseColor(themeColor)}
            onValueChange={(v) => setThemeColor(v.valueAsString)}
          >
            <ColorPickerControl>
              <ColorPickerInput />
              <ColorPickerTrigger />
              <ResetButton onClick={() => setThemeColor(defaultThemeColor)} />
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
      {isSupportZoom() && settings.zoom != null && (
        <div className={styles.rowSettings}>
          <div className={styles.rowSettingsLeft}>缩放：</div>
          <div className={styles.rowSettingsRight}>
            <StepperInput
              size="sm"
              value={settings.zoom.toString()}
              onValueChange={(v) => setZoom(v.valueAsNumber)}
              btnProps={{ size: 'sm' }}
              min={-8}
              max={8}
            />
            <ResetButton onClick={() => setZoom(0)} />
          </div>
        </div>
      )}
      {isSupportResizeWindow() && settings.windowSize && (
        <div className={styles.rowSettings}>
          <div className={styles.rowSettingsLeft}>窗口大小：</div>
          <div className={styles.rowSettingsRight}>
            <div>{`宽: ${settings.windowSize.width}, 高: ${settings.windowSize.height}`}</div>
            <ResetButton onClick={() => resetWindowSize()} />
          </div>
        </div>
      )}
    </div>
  );
};

export const Settings: React.FC<SettingsProps> = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const state = useSettingsState();
  const [tabValue, setTabValue] = useState(settingsTabs[0].value);
  return (
    <DialogRoot
      size="cover"
      placement="center"
      motionPreset="scale"
      closeOnInteractOutside
      open={state.isOpen}
      onOpenChange={(v) => state.setIsOpen(v.open)}
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
