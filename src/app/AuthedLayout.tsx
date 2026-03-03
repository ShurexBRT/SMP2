import { Outlet } from "react-router-dom";
import { HouseholdProvider } from "./HouseholdProvider";

export function AuthedLayout() {
  return (
    <HouseholdProvider>
      <Outlet />
    </HouseholdProvider>
  );
}
