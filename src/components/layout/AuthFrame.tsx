import type { ReactNode } from 'react';
import { CookingPot, Leaf, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Link className="brand" to="/login">
          <CookingPot size={27} className="brand-icon" />
          <span>
            <strong>Smart Meal Planner</strong>
          </span>
        </Link>
      </div>
      <div className="auth-content">
        <div className="auth-intro">
          <div className="auth-mark">
            <Leaf size={27} />
          </div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="panel auth-card">{children}</div>
        {footer && <div className="auth-footer">{footer}</div>}
        <p className="auth-footer flex gap-2 items-center justify-center">
          <ShieldCheck size={15} />
          Zajedno planirajte, kuvajte i kupujte.
        </p>
      </div>
    </main>
  );
}
