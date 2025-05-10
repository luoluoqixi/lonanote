import { Button, Select, Text, TextField } from '@radix-ui/themes';

import { ColorModeSelect } from '@/components';
import {
  changeToMobileUI,
  defaultThemeColor,
  isSupportResizeWindow,
  isSupportZoom,
  resetWindowSize,
  setThemeColor,
  setZoom,
  themeColors,
  useUISettings,
} from '@/controller/settings';
import { ThemeColorType } from '@/models/settings';

import { BaseSettingsPanelProps, ResetButton, useSettingsState } from '../Settings';
import '../Settings.scss';

export interface AppearanceSettingsProps extends BaseSettingsPanelProps {}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = () => {
  const settings = useUISettings();
  const themeColor = settings.themeColor || defaultThemeColor;
  return (
    <div className="appearanceSettings">
      <div className="rowSettings">
        <Text as="div" size="2" className="rowSettingsLeft">
          颜色模式：
        </Text>
        <div className="rowSettingsRight">
          <ColorModeSelect
            triggerProps={{
              style: {
                flexGrow: 1,
              },
            }}
          />
        </div>
      </div>
      <div className="rowSettings">
        <Text as="div" size="2" className="rowSettingsLeft">
          主题色：
        </Text>
        <div className="rowSettingsRight">
          <Select.Root
            value={themeColor}
            onValueChange={(v) => {
              if (v) {
                setThemeColor(v as ThemeColorType);
              }
            }}
          >
            <Select.Trigger style={{ flexGrow: 1 }}>{themeColor}</Select.Trigger>
            <Select.Content>
              {themeColors.map((item) => (
                <Select.Item key={item} value={item}>
                  {item}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <ResetButton onClick={() => setThemeColor(defaultThemeColor)} />
        </div>
      </div>
      {isSupportZoom() && settings.zoom != null && (
        <div className="rowSettings">
          <Text as="div" size="2" className="rowSettingsLeft">
            缩放：
          </Text>
          <div className="rowSettingsRight">
            <TextField.Root
              style={{ flexGrow: 1 }}
              type="number"
              value={settings.zoom}
              onChange={(e) => {
                if (e.target.value != null) {
                  const zoom = parseInt(e.target.value);
                  requestAnimationFrame(() => {
                    setZoom(zoom);
                    setTimeout(() => setZoom(zoom), 200);
                  });
                }
              }}
              min={-8}
              max={8}
            />
            <ResetButton onClick={() => setZoom(0)} />
          </div>
        </div>
      )}
      {isSupportResizeWindow() && settings.windowSize && (
        <div className="rowSettings">
          <Text as="div" size="2" className="rowSettingsLeft">
            窗口大小：
          </Text>
          <div className="rowSettingsRight">
            <Text size="2">{`宽: ${settings.windowSize.width}, 高: ${settings.windowSize.height}`}</Text>
            <ResetButton onClick={() => resetWindowSize()} />
          </div>
        </div>
      )}
      <div className="rowSettings">
        <Text as="div" size="2" className="rowSettingsLeft">
          {'UI模式：'}
        </Text>
        <div className="rowSettingsRight">
          <Button
            variant="ghost"
            onClick={() => {
              useSettingsState.getState().setIsOpen(false);
              changeToMobileUI();
            }}
          >
            切换到移动端UI
          </Button>
        </div>
      </div>
    </div>
  );
};
