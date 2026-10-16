import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { ErrorNotice } from '@/components/ui/Feedback';
import { AuthFrame } from '@/components/layout/AuthFrame';

export function LoginPage() {
  const nav = useNavigate(),
    loc = useLocation();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (result.error) throw result.error;
      const from = (loc.state as { from?: { pathname?: string; search?: string } } | null)?.from;
      const destination =
        from?.pathname?.startsWith('/') && !from.pathname.startsWith('//')
          ? from.pathname + (from.search ?? '')
          : '/plan';
      nav(destination, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthFrame
      title="Dobro došli nazad"
      subtitle="Vaš plan obroka, recepti i zalihe čekaju na jednom mestu."
      footer={
        <>
          Nemate nalog?{' '}
          <Link className="text-link" to="/signup">
            Napravite nalog
          </Link>
        </>
      }
    >
      <form className="form-stack" onSubmit={submit}>
        <label htmlFor="login-email">
          Email adresa
          <Input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ime@primer.rs"
          />
        </label>
        <label htmlFor="login-password">
          Lozinka
          <PasswordInput
            id="login-password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Unesite lozinku"
          />
        </label>
        <ErrorNotice error={error} />
        <Button type="submit" disabled={loading || !email.trim() || !password}>
          {loading ? 'Prijavljivanje…' : 'Prijavi se'}
          <ArrowRight size={17} />
        </Button>
      </form>
    </AuthFrame>
  );
}
