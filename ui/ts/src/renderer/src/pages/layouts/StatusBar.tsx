import { Text } from '@radix-ui/themes';
import React, { useEffect } from 'react';

import { useEditorData } from '@/controller/editor';

import './StatusBar.scss';

export interface StatusBarProps {}

const StatusBarLeft = () => {
  return <></>;
};

let timeId: number | null = null;

const StatusBarRight = () => {
  const currentEditorStatus = useEditorData((s) => s.currentEditorStatus);
  const nowSaved = useEditorData((s) => s.nowSaved);

  useEffect(() => {
    if (nowSaved) {
      if (timeId) {
        clearTimeout(timeId);
        timeId = null;
      }
      timeId = window.setTimeout(() => {
        const s = useEditorData.getState();
        useEditorData.setState({ ...s, nowSaved: false });
      }, 3000);
    }
  }, [nowSaved]);
  return (
    <>
      {currentEditorStatus && (
        <>
          {nowSaved && (
            <Text as="span" size="1" color="gray">
              已保存
            </Text>
          )}
          {currentEditorStatus.rowIndex != null && (
            <Text as="span" size="1" color="gray">
              行 {currentEditorStatus.rowIndex},
            </Text>
          )}
          {currentEditorStatus.colIndex != null && (
            <Text as="span" size="1" color="gray">
              列 {currentEditorStatus.colIndex}
            </Text>
          )}
          <Text as="span" size="1" color="gray">
            {currentEditorStatus.charCount}个字符
          </Text>
        </>
      )}
    </>
  );
};

export const StatusBar: React.FC<StatusBarProps> = () => {
  return (
    <div className="desktopLayoutStatusBarRoot">
      <div className="desktopLayoutStatusBarLeft">
        <StatusBarLeft />
      </div>
      <div className="desktopLayoutStatusBarRight">
        <StatusBarRight />
      </div>
    </div>
  );
};
