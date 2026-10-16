import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { Button } from '@/components/ui/Button';
import { ErrorNotice } from '@/components/ui/Feedback';

export function StarterRecipesCard({ householdId }: { householdId: string }) {
  const { session } = useAuth();
  const user = session?.user;
  const qc = useQueryClient();
  const context = useRef({ householdId, userId: user?.id });
  context.current = { householdId, userId: user?.id };
  const mounted = useRef(true);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Prijavi se pre dodavanja recepata.');
      const userId = user.id;
      setProgress(0);
      const { importStarterRecipes } = await import('./importStarterRecipes');
      return importStarterRecipes({
        householdId,
        userId,
        isCurrent: () =>
          mounted.current &&
          context.current.householdId === householdId &&
          context.current.userId === userId,
        onProgress: (done) => {
          if (mounted.current) setProgress(done);
        },
      });
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['recipes', householdId] }),
        qc.invalidateQueries({ queryKey: ['ingredients', householdId] }),
        qc.invalidateQueries({ queryKey: ['recipeSearchIngredients', householdId] }),
        qc.invalidateQueries({ queryKey: ['recipe', householdId] }),
        qc.invalidateQueries({ queryKey: ['recipeIngredients', householdId] }),
        qc.invalidateQueries({ queryKey: ['recipeEditor', householdId], refetchType: 'none' }),
      ]);
    },
  });
  return (
    <section className="panel form-stack" aria-label="Početna kolekcija recepata">
      <div className="panel-heading">
        <h2>
          <BookOpen size={19} /> Ideje za svaki dan
        </h2>
        <span className="badge">24 recepta</span>
      </div>
      <p className="muted text-sm">
        Kajgana, proja, domaća jela, losos, rižoto i još mnogo toga. Svaki recept ima sastojke,
        porcije i korake pripreme.
      </p>
      <p className="muted text-xs">Dodaju se u ovo domaćinstvo. Postojeći recepti se čuvaju.</p>
      <ErrorNotice error={mutation.error} />
      <div role="status" aria-live="polite" className="text-sm">
        {mutation.isPending && `Dodajem recepte… ${progress}/24. Sačekaj da se dodavanje završi.`}
        {mutation.data &&
          !mutation.isPending &&
          !mutation.error &&
          `Dodato: ${mutation.data.added}. Već sačuvano: ${mutation.data.skipped}.`}
        {mutation.error &&
          'Sačuvani recepti ostaju u zbirci. Ponovnim dodirom nastavljaš dodavanje.'}
      </div>
      <div>
        <Button
          type="button"
          disabled={mutation.isPending || !user}
          onClick={() => mutation.mutate()}
        >
          <Plus size={17} />
          {mutation.isPending ? 'Dodajem…' : 'Dodaj početne recepte'}
        </Button>
      </div>
    </section>
  );
}
