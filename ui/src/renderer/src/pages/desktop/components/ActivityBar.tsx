import { Button, Tabs, Tooltip } from '@radix-ui/themes';
import { ReactNode } from 'react';
import { LuFolder, LuLibraryBig, LuSearch, LuSettings } from 'react-icons/lu';

// import { VscExtensions } from 'react-icons/vsc';

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
  title?: ReactNode;
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
    title: <LuLibraryBig size={18} />,
    tooltip: '工作区',
  },
  {
    value: 'settings',
    title: <LuSettings size={18} />,
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

export const ActivityBar: React.FC<ActivityBarProps> = ({
  tabValue,
  isShowTabContent,
  setShowTabContent,
  onTabChange,
}) => {
  const curTabValue = tabValue || tabs[0].value;

  return (
    <div className={styles.title}>
      <div style={{ height: topHeight }} className={styles.titleTop}>
        <Tabs.Root
          aria-label="ActivityTabs"
          className={styles.titleTabRoot}
          value={isShowTabContent ? curTabValue : ''}
          orientation="vertical"
        >
          <Tabs.List wrap="wrap" style={{ boxShadow: 'none', width: '100%' }}>
            {tabs.map((tab) => {
              const isSelect = isShowTabContent && tab.value === curTabValue;
              return (
                <Tooltip key={tab.value} content={tab.tooltip} side="right">
                  <Tabs.Trigger
                    style={{
                      backgroundColor: isSelect ? 'var(--gray-a3)' : undefined,
                    }}
                    className={styles.titleTabItem}
                    key={tab.value}
                    value={tab.value}
                    onClick={() => {
                      if (tab.value === curTabValue) {
                        setShowTabContent?.(!isShowTabContent);
                      } else {
                        setShowTabContent?.(true);
                        onTabChange(tab.value);
                      }
                    }}
                  >
                    {tab.title}
                  </Tabs.Trigger>
                </Tooltip>
              );
            })}
          </Tabs.List>
        </Tabs.Root>
      </div>
      <div style={{ height: bottomHeight, gap: bottomGap }} className={styles.titleBottom}>
        {fixedBtns.map((item) => (
          <Tooltip key={item.value} content={item.tooltip} side="right">
            <Button
              variant="ghost"
              key={item.value}
              onClick={() => onBtnClick(item.value)}
              className={styles.titleBottomItem}
            >
              {item.title}
            </Button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
