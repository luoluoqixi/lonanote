import { IconButton } from '@chakra-ui/react';
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
        {functions.map((item) => (
          <div key={item.key} className={styles.titleFunctionItem}>
            <div className={styles.titleFunctionIcon}>
              <IconButton variant="ghost">{item.icon}</IconButton>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.titleBottom}>
        <div>123</div>
        <div>123</div>
        <div>123</div>
      </div>
    </div>
  );
};
