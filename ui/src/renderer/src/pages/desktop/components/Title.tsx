import React from 'react';

import styles from './Title.module.scss';

interface TitleProps {}

export const Title: React.FC<TitleProps> = () => {
  return <div className={styles.title}>LonaNote</div>;
};
