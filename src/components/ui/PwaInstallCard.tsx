import { Download, Check } from 'lucide-react';
import { installPwa, usePwaInstall } from '@/lib/pwa';
import { Button } from './Button';

export function PwaInstallCard() {
  const state = usePwaInstall();
  return (
    <section className="panel form-stack" aria-label="Instalacija aplikacije">
      <h2 className="text-base flex items-center gap-2">
        <Download size={19} />
        Aplikacija na početnom ekranu
      </h2>
      {state.installed ? (
        <p className="flex items-center gap-2 muted">
          <Check size={17} />
          Aplikacija je instalirana.
        </p>
      ) : (
        <>
          <p className="muted text-sm">Otvori planer sa početnog ekrana, kao zasebnu aplikaciju.</p>
          {state.available || state.pending ? (
            <Button disabled={state.pending} onClick={() => void installPwa()}>
              <Download size={17} />
              {state.pending ? 'Pripremam instalaciju…' : 'Instaliraj aplikaciju'}
            </Button>
          ) : (
            <p className="muted text-sm">
              {state.secure
                ? 'U meniju pregledača izaberi „Instaliraj aplikaciju“ ili „Dodaj na početni ekran“. Na iPhone-u koristi Podeli → Dodaj na početni ekran.'
                : 'Za instalaciju otvori aplikaciju preko HTTPS veze ili lokalne localhost adrese.'}
            </p>
          )}
        </>
      )}
      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
      <p className="muted text-xs">Za učitavanje podataka i čuvanje izmena potreban je internet.</p>
    </section>
  );
}
