import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useRequireHousehold } from "@/features/household/guard";
import { startOfWeekISO } from "@/lib/utils";

export function PlanPage() {
  const { ready } = useRequireHousehold();
  const weekStart = startOfWeekISO(new Date());

  if (!ready) {
    return (
      <Card>
        <CardHeader><CardTitle>Plan</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-600">
          Prvo napravi household (Nalog) da bi plan bio shared.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Nedeljni plan</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-600">
          MVP skeleton za v2. Ovaj ekran će da bude “engine”: Breakfast/Lunch/Dinner za svaki dan,
          auto-fill i generisanje liste za kupovinu.
          <div className="mt-2 text-xs text-neutral-500">Ova nedelja počinje: {weekStart}</div>
        </CardContent>
      </Card>
    </div>
  );
}
