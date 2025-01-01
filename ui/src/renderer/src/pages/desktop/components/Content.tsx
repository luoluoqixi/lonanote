import React from 'react';
import { Outlet } from 'react-router';

interface ContentProps {}

export const Content: React.FC<ContentProps> = () => {
  return (
    <>
      <Outlet />
    </>
  );
};
