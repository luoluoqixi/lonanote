import { Tabs } from '@chakra-ui/react';
import React from 'react';
import { LuFolder, LuSearch } from 'react-icons/lu';
import { VscExtensions } from 'react-icons/vsc';

import styles from './ActivityBar.module.scss';

interface ActivityBarProps {}

export interface FunctionType {
  key: string;
  title?: string;
  icon: React.ReactNode;
}

const functions: FunctionType[] = [
  {
    key: 'Explorer',
    icon: <LuFolder />,
    title: '资源管理器',
  },
  {
    key: 'Search',
    icon: <LuSearch />,
    title: '搜索',
  },
  {
    key: 'Extensions',
    icon: <VscExtensions />,
    title: '扩展',
  },
];

export const ActivityBar: React.FC<ActivityBarProps> = () => {
  return (
    <div className={styles.title}>
      <div className={styles.titleTop}>
        <Tabs.Root className={styles.titleTabRoot} orientation="vertical" variant="plain">
          <Tabs.List className={styles.titleTabList}>
            {functions.map((item) => (
              <Tabs.Trigger key={item.key} className={styles.titleTabItem} value={item.key}>
                <div className={styles.titleTabIcon}>{item.icon}</div>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      </div>
      <div className={styles.titleBottom}>
        <div>123</div>
        <div>123</div>
        <div>123</div>
      </div>
    </div>
  );
};
