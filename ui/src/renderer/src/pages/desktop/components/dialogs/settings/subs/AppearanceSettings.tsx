import { HStack, parseColor } from '@chakra-ui/react';

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
  StepperInput,
} from '@/components/ui';
import {
  defaultThemeColor,
  isSupportResizeWindow,
  isSupportZoom,
  resetWindowSize,
  setThemeColor,
  setZoom,
  useUISettings,
} from '@/controller/settings';

import { BaseSettingsPanelProps, ResetButton } from '../Settings';
import styles from '../Settings.module.scss';

export interface AppearanceSettingsProps extends BaseSettingsPanelProps {}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ contentRef }) => {
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
