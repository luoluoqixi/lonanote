import { RouteObject, RouterProvider, createBrowserRouter } from 'react-router';

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

const router = createBrowserRouter(routes);

export const Routes = () => {
  return <RouterProvider router={router} />;
};
