type Invitation = { id: string; role: string; status: string; user_id: string | null };
type Gateway = {
  user(): Promise<{ id: string; email?: string; email_confirmed_at?: string } | null>;
  owner(householdId: string, userId: string): Promise<boolean>;
  invitation(householdId: string, email: string): Promise<Invitation | null>;
  insert(householdId: string, email: string): Promise<void>;
};
type Config = {
  appUrl: string;
  mailKey: string;
  mailFrom: string;
  gateway(token: string): Gateway;
  fetcher?: typeof fetch;
  now?: () => number;
};
const pending = (row: Invitation | null) =>
  row?.role === 'member' && row.status === 'invited' && row.user_id === null;

// No auth credential in email: recipients must sign in and verify their address.
export function createInviteHandler(config: Config) {
  return async (req: Request): Promise<Response> => {
    let app: URL;
    try {
      app = new URL(config.appUrl);
      if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash)
        throw new Error('Invalid APP_URL');
    } catch {
      return Response.json({ error: 'Slanje pozivnica nije podešeno.' }, { status: 503 });
    }
    const headers = {
      'Access-Control-Allow-Origin': app.origin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    const reply = (status: number, error: string, saved = false) =>
      Response.json({ error, invitation_saved: saved }, { status, headers });
    if (req.headers.get('Origin') && req.headers.get('Origin') !== app.origin)
      return reply(403, 'Nedozvoljeno poreklo zahteva.');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return reply(405, 'Dozvoljen je samo POST zahtev.');
    const token = req.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return reply(401, 'Prijavite se ponovo.');
    let saved = false;
    try {
      const gateway = config.gateway(token);
      const user = await gateway.user();
      if (!user?.email_confirmed_at || !user.email)
        return reply(401, 'Potrebna je potvrđena prijava.');
      if (Number(req.headers.get('Content-Length')) > 2048) return reply(413, 'Prevelik zahtev.');
      const raw = await req.text();
      if (raw.length > 2048) return reply(413, 'Prevelik zahtev.');
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return reply(400, 'Neispravan zahtev.');
      }
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const householdId = body?.household_id;
      if (
        typeof householdId !== 'string' ||
        !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(householdId) ||
        email.length > 254 ||
        !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
      )
        return reply(400, 'Proverite email adresu i domaćinstvo.');
      if (!(await gateway.owner(householdId, user.id)))
        return reply(403, 'Samo vlasnik može da poziva članove.');
      if (email === user.email.toLowerCase()) return reply(409, 'Već ste član ovog domaćinstva.');
      if (!config.mailKey || !config.mailFrom)
        return reply(503, 'Slanje mejla nije podešeno. Pozivnica nije poslata.');
      let invitation = await gateway.invitation(householdId, email);
      if (invitation && !pending(invitation)) return reply(409, 'Ova osoba već ima članstvo.');
      if (!invitation) {
        await gateway.insert(householdId, email);
        invitation = await gateway.invitation(householdId, email);
      }
      if (!pending(invitation)) return reply(409, 'Članstvo je promenjeno. Osvežite stranicu.');
      saved = true;
      // Provider deduplicates retries in the same 10-minute window. This is not
      // a durable server rate limiter; see release gates before deployment.
      const key = `smp2-invite-${invitation!.id}-${Math.floor((config.now?.() ?? Date.now()) / 600000)}`;
      const login = new URL(app.href);
      login.hash = '/login';
      const message = `Pozvani ste u zajedničko domaćinstvo u Smart Meal Planner aplikaciji.\n\nOtvorite ${login.href}\n\nPrijavite se ovom email adresom. Ako nemate nalog, registrujte se i potvrdite adresu, zatim se prijavite. U odeljku Nalog možete izabrati „Proveri pozivnicu“.\n\nOvaj link ne daje pristup bez prijave i potvrđene email adrese. Ako niste očekivali ovu pozivnicu, zanemarite poruku.`;
      const result = await (config.fetcher ?? fetch)('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.mailKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          from: config.mailFrom,
          to: [email],
          subject: 'Poziv u domaćinstvo — Smart Meal Planner',
          text: message,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!result.ok)
        return reply(
          result.status === 429 ? 429 : 502,
          'Pozivnica je sačuvana, ali slanje mejla nije potvrđeno. Pokušajte ponovo.',
          true
        );
      const receipt = await result.json();
      if (typeof receipt?.id !== 'string' || !receipt.id)
        return reply(
          502,
          'Pozivnica je sačuvana, ali slanje mejla nije potvrđeno. Pokušajte ponovo.',
          true
        );
      return Response.json(
        { ok: true, invitation_saved: true, email_status: 'accepted' },
        { headers }
      );
    } catch {
      return reply(
        502,
        saved
          ? 'Pozivnica je sačuvana, ali slanje mejla nije potvrđeno. Pokušajte ponovo.'
          : 'Pozivanje nije završeno. Osvežite stranicu i pokušajte ponovo.',
        saved
      );
    }
  };
}
