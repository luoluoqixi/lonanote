import React, { lazy } from 'react';

import styles from './SideBar.module.scss';

const tabsRenders: Record<string, React.FC<any>> = {
  explorer: lazy(() => import('./tabs/Explorer')),
  search: lazy(() => import('./tabs/Search')),
};

interface SideBarProps {
  tabValue?: string | undefined;
}

export const SideBar: React.FC<SideBarProps> = ({ tabValue }) => {
  const getTabRender = (tabValue: string | undefined) => {
    if (tabValue && tabsRenders[tabValue]) {
      const Tab = tabsRenders[tabValue];
      return <Tab />;
    }
    return <></>;
  };
  return <div className={styles.sidebar}>{getTabRender(tabValue)}</div>;
};
