import { RouteObject, RouterProvider, createBrowserRouter } from 'react-router';

import Index from './pages/Index';
import Layout from './pages/Layout';
import Test from './pages/test/Test';

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        // Component: Index,
        Component: Test,
      },
    ],
  },
];

const router = createBrowserRouter(routes);

export const Routes = () => {
  return <RouterProvider router={router} />;
};
