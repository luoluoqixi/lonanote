import React from 'react';

import { config } from '@/config';

import './Title.scss';

export interface TitleProps {}

export const Title: React.FC<TitleProps> = () => {
  return <div className="desktopLayoutTitleRoot">lonanote - 露娜笔记 v{config.version}</div>;
};
