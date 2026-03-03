import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useRequireHousehold } from "@/features/household/guard";

export function InventoryPage() {
  const { ready } = useRequireHousehold();

  if (!ready) {
    return (
      <Card>
        <CardHeader><CardTitle>Frižider</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-600">
          Prvo napravi household (Nalog).
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Inventar</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-600">
          MVP skeleton: ovde radimo inventory CRUD, min_qty, “low stock”, i povezivanje sa kupovinom.
        </CardContent>
      </Card>
    </div>
  );
}
