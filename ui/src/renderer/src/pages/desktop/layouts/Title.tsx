import React from 'react';

import styles from './Title.module.scss';

export interface TitleProps {}

export const Title: React.FC<TitleProps> = () => {
  return <div className={styles.title}>LonaNote</div>;
};
