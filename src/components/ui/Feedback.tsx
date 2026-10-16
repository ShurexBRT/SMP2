import type { ReactNode } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorMessage } from '@/lib/utils';

export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <div>
        <p>{errorMessage(error)}</p>
        {retry && (
          <button className="text-link mt-2" onClick={retry}>
            Pokušaj ponovo
          </button>
        )}
      </div>
    </div>
  );
}
export function Loading({ label = 'Učitavanje…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function HouseholdGate() {
  return (
    <EmptyState icon={<ArrowRight size={28} />} title="Sve počinje vašim domaćinstvom">
      Povežite recepte, plan i zalihe na jednom mestu.
      <Link className="button button-primary mt-5" to="/account">
        Podesi domaćinstvo <ArrowRight size={16} />
      </Link>
    </EmptyState>
  );
}
