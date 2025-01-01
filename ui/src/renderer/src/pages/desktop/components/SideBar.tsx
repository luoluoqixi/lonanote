import React from 'react';

import styles from './SideBar.module.scss';

interface SideBarProps {}

export const SideBar: React.FC<SideBarProps> = () => {
  return <div className={styles.sidebar}>sideBar</div>;
};
