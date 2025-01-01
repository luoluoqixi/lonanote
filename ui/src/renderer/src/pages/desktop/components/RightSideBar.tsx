import React from 'react';

import styles from './RightSideBar.module.scss';

interface RightSideBarProps {}

export const RightSideBar: React.FC<RightSideBarProps> = () => {
  return <div className={styles.rightSidebar}>rightSideBar</div>;
};
