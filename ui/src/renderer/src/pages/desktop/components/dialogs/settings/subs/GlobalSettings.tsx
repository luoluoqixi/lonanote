import { path } from '@/bindings/api/path';
import { Button, Switch } from '@/components/ui';
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
