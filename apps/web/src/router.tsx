import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import Layout from './app/layout';
import CartScreen from './screens/cart';
import CheckoutScreen from './screens/checkout';
import ConfirmScreen from './screens/confirm';
import DetailScreen from './screens/detail';
import ListScreen from './screens/list';
import OrdersScreen from './screens/orders';
import SavedScreen from './screens/saved';
import TrackScreen from './screens/track';

// Exported so tests can mount the same routes via createMemoryRouter.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <ListScreen /> },
      { path: 'p/:id', element: <DetailScreen /> },
      { path: 'saved', element: <SavedScreen /> },
      { path: 'cart', element: <CartScreen /> },
      { path: 'orders', element: <OrdersScreen /> },
      { path: 'checkout', element: <CheckoutScreen /> },
      { path: 'confirm', element: <ConfirmScreen /> },
      { path: 'track/:id', element: <TrackScreen /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
