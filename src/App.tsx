import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { EstoqueCD } from './pages/EstoqueCD';
import { Quiosque } from './pages/Quiosque';
import { EntradaCD } from './pages/EntradaCD';
import { Transferencia } from './pages/Transferencia';
import { Produtos } from './pages/Produtos';
import { Movimentacoes } from './pages/Movimentacoes';
import { Login } from './pages/Login';
import { useWmsStore } from './store/wmsStore';
import { useAuthStore } from './store/authStore';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'estoque-cd', element: <EstoqueCD /> },
          { path: 'quiosque/:slug', element: <Quiosque /> },
          { path: 'entrada-cd', element: <EntradaCD /> },
          { path: 'transferencia', element: <Transferencia /> },
          { path: 'produtos', element: <Produtos /> },
          { path: 'movimentacoes', element: <Movimentacoes /> },
        ],
      },
    ],
  },
]);

function App() {
  const initBootstrap = useWmsStore(s => s.initBootstrap);
  const initAuth = useAuthStore(s => s.initAuth);
  const session = useAuthStore(s => s.session);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (session) initBootstrap();
  }, [session, initBootstrap]);

  return <RouterProvider router={router} />;
}

export default App;
