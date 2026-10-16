import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  BookOpen,
  ShoppingBasket,
  Refrigerator,
  UserRound,
  CookingPot,
} from 'lucide-react';
import { useHousehold } from '@/app/HouseholdProvider';
import { ErrorNotice, Loading } from '@/components/ui/Feedback';

const items = [
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/recipes', label: 'Recepti', icon: BookOpen },
  { to: '/shopping', label: 'Kupovina', icon: ShoppingBasket },
  { to: '/inventory', label: 'Frižider', icon: Refrigerator },
];
const titles: Record<string, string> = {
  plan: 'Planer obroka',
  recipes: 'Knjiga recepata',
  shopping: 'Lista za kupovinu',
  inventory: 'Frižider i zalihe',
  account: 'Nalog i domaćinstvo',
};

export function AppShell() {
  const { pathname } = useLocation();
  const { loading, error, refetch } = useHousehold();
  const title = titles[pathname.split('/')[1]] ?? 'Smart Meal Planner';
  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Preskoči na sadržaj
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link to="/plan" className="brand" aria-label="Smart Meal Planner – Plan">
            <CookingPot className="brand-icon" size={29} />
            <span>
              <small>Smart Meal Planner</small>
              <strong>{title}</strong>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Glavna navigacija">
            {items.map(({ icon: Icon, ...item }) => (
              <NavLink key={item.to} className="nav-link" to={item.to}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Link to="/account" className="account-link" aria-label="Nalog i podešavanja">
            <UserRound size={19} />
          </Link>
        </div>
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        {loading ? (
          <Loading label="Učitavam domaćinstvo…" />
        ) : error ? (
          <ErrorNotice error={error} retry={() => void refetch()} />
        ) : (
          <Outlet />
        )}
      </main>
      <footer className="app-footer">Saki &amp; Peki · Smart Meal Planner</footer>
      <nav className="mobile-nav" aria-label="Mobilna navigacija">
        {items.map(({ icon: Icon, ...item }) => (
          <NavLink key={item.to} className="nav-link" to={item.to}>
            <Icon size={21} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
