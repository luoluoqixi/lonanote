import React from 'react';
import { LuFolder, LuLibraryBig, LuSearch, LuSettings } from 'react-icons/lu';
import { VscExtensions } from 'react-icons/vsc';

import { Icon, IconButton, Tabs, Tooltip } from '@/components/ui';

import styles from './ActivityBar.module.scss';

interface ActivityBarProps {}

export interface FunctionType {
  value: string;
  title?: React.ReactNode;
  tooltip?: string;
}

const tabs: FunctionType[] = [
  {
    value: 'explorer',
    title: <LuFolder />,
    tooltip: '资源管理器',
  },
  {
    value: 'search',
    title: <LuSearch />,
    tooltip: '搜索',
  },
  {
    value: 'extensions',
    title: <VscExtensions />,
    tooltip: '扩展',
  },
];

const fixedBtns: FunctionType[] = [
  {
    value: 'library',
    title: <LuLibraryBig />,
    tooltip: '切换空间',
  },
  {
    value: 'settings',
    title: <LuSettings />,
    tooltip: '设置',
  },
];

const bottomBtnHeight = 40;
const bottomGap = 2;
const bottomHeight = fixedBtns.length * bottomBtnHeight + (fixedBtns.length - 1) * bottomGap;
const topHeight = `calc(100% - ${bottomHeight}px)`;

export const ActivityBar: React.FC<ActivityBarProps> = () => {
  return (
    <div className={styles.title}>
      <div style={{ height: topHeight }} className={styles.titleTop}>
        <Tabs
          className={styles.titleTabRoot}
          orientation="vertical"
          variant="subtle"
          tabs={tabs}
          itemRender={(item) => <Icon size="md">{item.title}</Icon>}
          triggerListProps={{ className: styles.titleTabList }}
          triggerProps={{ className: styles.titleTabItem }}
          tooltipProps={{ positioning: { placement: 'right' } }}
        />
      </div>
      <div style={{ height: bottomHeight, gap: bottomGap }} className={styles.titleBottom}>
        {fixedBtns.map((item) => (
          <div key={item.value}>
            <Tooltip content={item.tooltip} positioning={{ placement: 'right' }}>
              <IconButton className={styles.titleBottomItem} variant="ghost">
                {item.title}
              </IconButton>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
};
