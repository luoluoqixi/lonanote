import { Text } from '@radix-ui/themes';
import React, { useEffect } from 'react';

import { useEditor } from '@/controller/editor';

import styles from './StatusBar.module.scss';

export interface StatusBarProps {}

const StatusBarLeft = () => {
  return <></>;
};

let timeId: number | null = null;

const StatusBarRight = () => {
  const currentEditorStatus = useEditor((s) => s.currentEditorStatus);
  const nowSaved = useEditor((s) => s.nowSaved);

  useEffect(() => {
    if (nowSaved) {
      if (timeId) {
        clearTimeout(timeId);
        timeId = null;
      }
      timeId = window.setTimeout(() => {
        const s = useEditor.getState();
        useEditor.setState({ ...s, nowSaved: false });
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
    <div className={styles.statusBar}>
      <div className={styles.statusBarLeft}>
        <StatusBarLeft />
      </div>
      <div className={styles.statusBarRight}>
        <StatusBarRight />
      </div>
    </div>
  );
};
