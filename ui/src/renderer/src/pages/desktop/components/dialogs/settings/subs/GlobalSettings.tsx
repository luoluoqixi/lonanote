import { Button, Switch, Text } from '@radix-ui/themes';

import { path } from '@/bindings/api/path';
import { config } from '@/config';
import {
  setSettingsAutoCheckUpdate,
  setSettingsAutoOpenLastWorkspace,
  useSettings,
} from '@/controller/settings';

import { BaseSettingsPanelProps } from '../Settings';
import styles from '../Settings.module.scss';

const isShowDevUI = true;

export interface GlobalSettingsProps extends BaseSettingsPanelProps {}

export const GlobalSettings: React.FC<GlobalSettingsProps> = () => {
  const settings = useSettings((s) => s.settings);
  return settings ? (
    <div className={styles.globalSettings}>
      <div className={styles.rowSettings}>
        <Text as="div" size="2" className={styles.rowSettingsLeft}>
          自动检查更新：
        </Text>
        <div className={styles.rowSettingsRight}>
          <Switch
            checked={settings.autoCheckUpdate}
            onCheckedChange={(v) => setSettingsAutoCheckUpdate(v)}
          />
        </div>
      </div>
      <div className={styles.rowSettings}>
        <Text as="div" size="2" className={styles.rowSettingsLeft}>
          自动打开上次工作区：
        </Text>
        <div className={styles.rowSettingsRight}>
          <Switch
            checked={settings.autoOpenLastWorkspace}
            onCheckedChange={(v) => setSettingsAutoOpenLastWorkspace(v)}
          />
        </div>
      </div>
      {config.isDev && isShowDevUI && (
        <div className={styles.rowSettings}>
          <Text as="div" size="2" className={styles.rowSettingsLeft}>
            {'配置目录(开发模式)：'}
          </Text>
          <div className={styles.rowSettingsRight}>
            <Button
              variant="ghost"
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
