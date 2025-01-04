import React from 'react';
import { Outlet } from 'react-router';

import styles from './Content.module.scss';

export interface ContentProps {}

export const Content: React.FC<ContentProps> = () => {
  return (
    <div className={styles.content}>
      <Outlet />
    </div>
  );
};
