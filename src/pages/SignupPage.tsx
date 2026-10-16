import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { ErrorNotice } from '@/components/ui/Feedback';
import { AuthFrame } from '@/components/layout/AuthFrame';

export function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(new Error('Lozinka mora imati najmanje 8 znakova.'));
      return;
    }
    if (password !== confirmation) {
      setError(new Error('Lozinke se ne poklapaju.'));
      return;
    }
    setBusy(true);
    try {
      const base = window.location.href.split('#')[0];
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: `${base}#/auth/callback` },
      });
      if (error) throw error;
      if (data.session) nav('/account', { replace: true });
      else {
        setSent(true);
        setPassword('');
        setConfirmation('');
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title={sent ? 'Proverite svoj email' : 'Manje brige oko obroka'}
      subtitle={
        sent
          ? 'Ako je potrebna potvrda, poslaćemo vam link za nastavak.'
          : 'Napravite nalog i organizujte zajedničku kuhinju.'
      }
      footer={
        <>
          Već imate nalog?{' '}
          <Link className="text-link" to="/login">
            Prijavite se
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="form-stack text-center">
          <MailCheck size={32} className="brand-icon mx-auto" />
          <p>
            Proverite prijemno sanduče i spam folder za <strong>{email}</strong>. Otvorite link u
            ovom browseru da završite potvrdu.
          </p>
          <Link className="button button-secondary" to="/login">
            Nazad na prijavu
          </Link>
        </div>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          <label htmlFor="signup-email">
            Email adresa
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ime@primer.rs"
            />
          </label>
          <label htmlFor="signup-password">
            Lozinka
            <PasswordInput
              id="signup-password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Najmanje 8 znakova"
            />
          </label>
          <label htmlFor="signup-confirm">
            Potvrdi lozinku
            <PasswordInput
              id="signup-confirm"
              required
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Ponovite lozinku"
            />
          </label>
          <ErrorNotice error={error} />
          <Button type="submit" disabled={busy || !email.trim() || !password || !confirmation}>
            {busy ? 'Pravim nalog…' : 'Napravi nalog'}
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
