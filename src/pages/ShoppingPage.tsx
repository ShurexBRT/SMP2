import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useRequireHousehold } from "@/features/household/guard";

export function ShoppingPage() {
  const { ready } = useRequireHousehold();

  if (!ready) {
    return (
      <Card>
        <CardHeader><CardTitle>Kupovina</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-600">
          Prvo napravi household (Nalog).
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Lista za kupovinu</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-600">
          MVP skeleton: ovde sledeće radimo generator iz plana + inventory (A+B),
          grupisanje po kategorijama, manual add item, share/copy.
        </CardContent>
      </Card>
    </div>
  );
}
