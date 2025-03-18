import { Select, Text, TextField } from '@radix-ui/themes';

import { ColorModeSelect } from '@/components';
import {
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

import { BaseSettingsPanelProps, ResetButton } from '../Settings';
import styles from '../Settings.module.scss';

export interface AppearanceSettingsProps extends BaseSettingsPanelProps {}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = () => {
  const settings = useUISettings();
  const themeColor = settings.themeColor || defaultThemeColor;
  return (
    <div className={styles.appearanceSettings}>
      <div className={styles.rowSettings}>
        <Text as="div" size="2" className={styles.rowSettingsLeft}>
          颜色模式：
        </Text>
        <div className={styles.rowSettingsRight}>
          <ColorModeSelect
            triggerProps={{
              style: {
                flexGrow: 1,
              },
            }}
          />
        </div>
      </div>
      <div className={styles.rowSettings}>
        <Text as="div" size="2" className={styles.rowSettingsLeft}>
          主题色：
        </Text>
        <div className={styles.rowSettingsRight}>
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
        <div className={styles.rowSettings}>
          <Text as="div" size="2" className={styles.rowSettingsLeft}>
            缩放：
          </Text>
          <div className={styles.rowSettingsRight}>
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
        <div className={styles.rowSettings}>
          <Text as="div" size="2" className={styles.rowSettingsLeft}>
            窗口大小：
          </Text>
          <div className={styles.rowSettingsRight}>
            <Text size="2">{`宽: ${settings.windowSize.width}, 高: ${settings.windowSize.height}`}</Text>
            <ResetButton onClick={() => resetWindowSize()} />
          </div>
        </div>
      )}
    </div>
  );
};
