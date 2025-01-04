import React from 'react';

import styles from './StatusBar.module.scss';

export interface StatusBarProps {}

export const StatusBar: React.FC<StatusBarProps> = () => {
  return <div className={styles.statusBar}>statusBar</div>;
};
