import { RouteObject, RouterProvider, createBrowserRouter, createHashRouter } from 'react-router';

// import Test from '../test/Test';
import Index from './Index';
import Layout from './Layout';

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        Component: Index,
        // Component: Test,
      },
    ],
  },
];

const isWeb = false;

export const router = isWeb ? createBrowserRouter(routes) : createHashRouter(routes);

export const Routes = () => {
  return <RouterProvider router={router} />;
};
