import { Outlet } from 'react-router-dom';
import { HouseholdProvider } from './HouseholdProvider';
import { useAuth } from './AuthProvider';

export function AuthedLayout() {
  const { session } = useAuth();
  return (
    <HouseholdProvider key={session?.user.id}>
      <Outlet />
    </HouseholdProvider>
  );
}
