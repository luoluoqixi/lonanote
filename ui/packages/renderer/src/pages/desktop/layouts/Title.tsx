import React from 'react';

import './Title.scss';

export interface TitleProps {}

export const Title: React.FC<TitleProps> = () => {
  return <div className="desktopLayoutTitleRoot">LonaNote</div>;
};
