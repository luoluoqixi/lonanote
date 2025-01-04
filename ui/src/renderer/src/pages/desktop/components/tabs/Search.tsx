import React from 'react';

import styles from './Search.module.scss';

interface SearchProps {}

const Search: React.FC<SearchProps> = () => {
  return <div className={styles.search}>搜索：TODO</div>;
};

export default Search;
