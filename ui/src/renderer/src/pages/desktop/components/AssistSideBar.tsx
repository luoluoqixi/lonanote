import React from 'react';

import styles from './AssistSideBar.module.scss';

interface AssistSideBarProps {}

export const AssistSideBar: React.FC<AssistSideBarProps> = () => {
  return <div className={styles.assistSideBar}>assistSideBar</div>;
};
