import React from 'react';

import styles from './Explorer.module.scss';

interface ExplorerProps {}

const Explorer: React.FC<ExplorerProps> = () => {
  return <div className={styles.explorer}>explorer</div>;
};

export default Explorer;
