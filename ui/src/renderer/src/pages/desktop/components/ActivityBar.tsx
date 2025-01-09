import React from 'react';
import { LuFolder, LuLibraryBig, LuSearch, LuSettings } from 'react-icons/lu';

// import { VscExtensions } from 'react-icons/vsc';

import { Icon, IconButton, Tabs, Tooltip } from '@/components/ui';

import styles from './ActivityBar.module.scss';
import { useSettingsState } from './dialogs/settings';
import { useWorkspaceManagerState } from './dialogs/workspaceManager';

export interface ActivityBarProps {
  tabValue: string | undefined;
  onTabChange: (v: string) => void;
  isShowTabContent?: boolean;
  setShowTabContent?: (isShow: boolean) => void;
}

export interface FunctionType {
  value: string;
  title?: React.ReactNode;
  tooltip?: string;
}

const tabs: FunctionType[] = [
  {
    value: 'explorer',
    title: <LuFolder strokeWidth={2.5} />,
    tooltip: '资源管理器',
  },
  {
    value: 'search',
    title: <LuSearch strokeWidth={2.5} />,
    tooltip: '搜索',
  },
  // {
  //   value: 'extensions',
  //   title: <VscExtensions strokeWidth={1} />,
  //   tooltip: '扩展',
  // },
];

const fixedBtns: FunctionType[] = [
  {
    value: 'workspace',
    title: <LuLibraryBig />,
    tooltip: '工作区',
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

const onBtnClick = (value: string) => {
  if (value === 'workspace') {
    useWorkspaceManagerState.getState().setIsOpen(true);
  } else if (value === 'settings') {
    useSettingsState.getState().setIsOpen(true);
  }
};

const startTabIndex = 0;

export const ActivityBar: React.FC<ActivityBarProps> = ({
  tabValue,
  isShowTabContent,
  setShowTabContent,
  onTabChange,
}) => {
  const curTabValue = tabValue || tabs[0].value;
  const tabsIndex = startTabIndex;
  const btnIndex = tabsIndex + tabs.length;
  return (
    <div className={styles.title}>
      <div style={{ height: topHeight }} className={styles.titleTop}>
        <Tabs
          className={styles.titleTabRoot}
          orientation="vertical"
          variant="subtle"
          tabs={tabs}
          value={isShowTabContent ? curTabValue : ''}
          itemRender={(item) => <Icon fontSize="1.25em">{item.title}</Icon>}
          triggerListProps={{ className: styles.titleTabList }}
          triggerProps={{
            className: styles.titleTabItem,
          }}
          tooltipProps={{ positioning: { placement: 'right' } }}
          onValueChange={(e) => onTabChange(e.value)}
          startTabIndex={tabsIndex}
          onTriggerClick={(v) => {
            if (v.value === curTabValue) {
              setShowTabContent?.(!isShowTabContent);
            } else {
              setShowTabContent?.(true);
            }
          }}
        />
      </div>
      <div style={{ height: bottomHeight, gap: bottomGap }} className={styles.titleBottom}>
        {fixedBtns.map((item, i) => (
          <div key={item.value}>
            <Tooltip content={item.tooltip} positioning={{ placement: 'right' }}>
              <IconButton
                tabIndex={btnIndex + i}
                onClick={() => onBtnClick(item.value)}
                className={styles.titleBottomItem}
                variant="ghost"
              >
                {item.title}
              </IconButton>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
};
