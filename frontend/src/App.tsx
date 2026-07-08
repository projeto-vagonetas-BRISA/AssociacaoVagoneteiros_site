import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/authContext';
import { router } from './routes';

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
