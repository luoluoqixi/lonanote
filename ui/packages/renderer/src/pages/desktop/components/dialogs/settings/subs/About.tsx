import { Button, Spinner, Text, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { toast } from 'react-toastify';

import { dialog } from '@/components';
import { config } from '@/config';
import { checkUpdate } from '@/controller/settings';
import { mdUtils } from '@/utils';

import { BaseSettingsPanelProps } from '../Settings';

export interface AboutProps extends BaseSettingsPanelProps {}

export const About: React.FC<AboutProps> = () => {
  const [checkUpdateLoading, setCheckUpdateLoading] = useState(false);
  const checkUpdateClick = async () => {
    setCheckUpdateLoading(true);
    try {
      // 检查更新
      const nextVersion = await checkUpdate(config.version);
      if (nextVersion != null) {
        let body = '';
        if (nextVersion.latestVersion.body != null) {
          body = await mdUtils.mdToHtml(nextVersion.latestVersion.body);
        }
        dialog.showDialog({
          title: `新版本: ${nextVersion.latestVersion.tag_name}`,
          content: <div dangerouslySetInnerHTML={{ __html: body }} />,
          okText: '前往下载',
          cancelText: '关闭',
          onOk() {
            const url = nextVersion.downloadUrl;
            window.open(url);
            return false;
          },
        });
      } else {
        toast.success(`已经是最新版: v${config.version}`);
      }
    } catch (e: any) {
      toast.error(`检查更新失败: ${e}`);
    }
    setCheckUpdateLoading(false);
  };
  return (
    <div className="about">
      <div className="rowSettings">
        <Text as="div" size="2" className="rowSettingsLeft">
          当前版本：
        </Text>
        <div className="rowSettingsRight">
          <TextField.Root style={{ width: '100%' }} value={`v${config.version}`} readOnly />
          <Button
            disabled={checkUpdateLoading}
            style={{ width: '100px' }}
            onClick={checkUpdateClick}
          >
            <Spinner loading={checkUpdateLoading}></Spinner>
            检查更新
          </Button>
        </div>
      </div>
    </div>
  );
};
