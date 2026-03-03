import { useHousehold } from "@/app/HouseholdProvider";

export function useRequireHousehold() {
  const hh = useHousehold();
  return {
    ...hh,
    ready: !hh.loading && !!hh.householdId,
  };
}
