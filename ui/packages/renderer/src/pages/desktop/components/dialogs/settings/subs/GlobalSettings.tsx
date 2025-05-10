import { Button, Switch, Text, TextField } from '@radix-ui/themes';

import { path } from '@/bindings/api/path';
import { config } from '@/config';
import {
  resetSettingsAutoSaveInterval,
  setSettingsAutoCheckUpdate,
  setSettingsAutoOpenLastWorkspace,
  setSettingsAutoSave,
  setSettingsAutoSaveFocusChange,
  setSettingsAutoSaveInterval,
  useSettings,
} from '@/controller/settings';

import { BaseSettingsPanelProps, ResetButton } from '../Settings';
import '../Settings.scss';

const isShowDevUI = true;

export interface GlobalSettingsProps extends BaseSettingsPanelProps {}

export const GlobalSettings: React.FC<GlobalSettingsProps> = () => {
  const settings = useSettings((s) => s.settings);
  return settings ? (
    <div className="globalSettings">
      <div className="rowSettings">
        <Text as="div" size="2" className="rowSettingsLeft">
          自动检查更新：
        </Text>
        <div className="rowSettingsRight">
          <Switch
            checked={settings.autoCheckUpdate}
            onCheckedChange={(v) => setSettingsAutoCheckUpdate(v)}
          />
        </div>
      </div>
      <div className="rowSettings">
        <Text as="div" size="2" className="rowSettingsLeft">
          自动打开上次工作区：
        </Text>
        <div className="rowSettingsRight">
          <Switch
            checked={settings.autoOpenLastWorkspace}
            onCheckedChange={(v) => setSettingsAutoOpenLastWorkspace(v)}
          />
        </div>
      </div>
      <div className="rowSettings">
        <Text as="div" size="2" className="rowSettingsLeft">
          编辑时自动保存：
        </Text>
        <div className="rowSettingsRight">
          <Switch checked={settings.autoSave} onCheckedChange={(v) => setSettingsAutoSave(v)} />
        </div>
      </div>
      <div className="rowSettings">
        <Text as="div" size="2" className="rowSettingsLeft">
          自动保存间隔 (秒)：
        </Text>
        <div className="rowSettingsRight">
          <TextField.Root
            readOnly={!settings.autoSave}
            style={{ width: '100%' }}
            type="number"
            spellCheck="false"
            placeholder="自动保存间隔"
            value={settings.autoSaveInterval}
            onChange={(e) => {
              const s = e.target.value;
              const num = Number(s);
              if (Number.isNaN(num)) {
                return;
              }
              setSettingsAutoSaveInterval(num);
            }}
          />
          <ResetButton onClick={() => resetSettingsAutoSaveInterval()} />
        </div>
      </div>
      <div className="rowSettings">
        <Text as="div" size="2" className="rowSettingsLeft">
          失去焦点时自动保存：
        </Text>
        <div className="rowSettingsRight">
          <Switch
            checked={settings.autoSaveFocusChange}
            onCheckedChange={(v) => setSettingsAutoSaveFocusChange(v)}
          />
        </div>
      </div>
      {config.isDev && isShowDevUI && (
        <div className="rowSettings">
          <Text as="div" size="2" className="rowSettingsLeft">
            {'配置目录(开发模式)：'}
          </Text>
          <div className="rowSettingsRight">
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
