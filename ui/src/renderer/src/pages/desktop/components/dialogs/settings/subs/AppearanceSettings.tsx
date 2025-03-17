import { Text, TextField } from '@radix-ui/themes';

import { ColorModeSelect } from '@/components';
import {
  // defaultThemeColor,
  isSupportResizeWindow,
  isSupportZoom,
  resetWindowSize,
  // setThemeColor,
  setZoom,
  useUISettings,
} from '@/controller/settings';

import { BaseSettingsPanelProps, ResetButton } from '../Settings';
import styles from '../Settings.module.scss';

export interface AppearanceSettingsProps extends BaseSettingsPanelProps {}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = () => {
  const settings = useUISettings();
  // const themeColor = settings.themeColor;
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
                width: '100%',
              },
            }}
          />
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
            <ResetButton className="ml-1" onClick={() => setZoom(0)} />
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

{
  /*
      <div className={styles.rowSettings}>
        <div className={styles.rowSettingsLeft}>主题颜色：</div>
        <div className={styles.rowSettingsRight}>
          <InputText
            pt={{
              root: {
                style: {
                  width: '100%',
                  height: '40px',
                },
              },
            }}
            spellCheck="false"
            value={themeColor}
            onChange={(e) => setThemeColor(e.target.value)}
          />
          <ResetButton className="ml-1" onClick={() => setThemeColor(defaultThemeColor)} />
        </div>
      </div> */
}
{
  /* <ColorPicker.Root
            width="100%"
            size="sm"
            value={parseColor(themeColor)}
            onValueChange={(v) => setThemeColor(v.valueAsString)}
          >
            <ColorPicker.Control>
              <ColorPicker.Input />
              <ColorPicker.Trigger />
              <ResetButton onClick={() => setThemeColor(defaultThemeColor)} />
            </ColorPicker.Control>
            <ColorPicker.Content portalRef={contentRef}>
              <ColorPicker.Area />
              <HStack>
                <ColorPicker.EyeDropper />
                <ColorPicker.Sliders />
              </HStack>
            </ColorPicker.Content>
          </ColorPicker.Root> */
}
