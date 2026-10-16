/* Installation support only: private pages, Auth and API responses are never cached. */
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#45634a"><title>Smart Meal Planner · Nema veze</title><body style="margin:0;padding:48px 24px;background:#fafaf7;color:#181d19;font:16px/1.6 system-ui,sans-serif"><main style="max-width:420px;margin:10vh auto"><h1>Nema internet veze</h1><p>Poveži se na internet da učitaš plan, recepte i zalihe. Podaci se ne čuvaju za rad bez interneta.</p><button type="button" onclick="location.reload()" style="padding:12px 20px;background:#45634a;color:white;border:0;border-radius:12px;font:inherit;cursor:pointer">Pokušaj ponovo</button></main></body></html>',
          {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
          }
        )
    )
  );
});
