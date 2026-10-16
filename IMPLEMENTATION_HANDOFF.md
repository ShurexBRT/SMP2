# Stitch UI i funkcionalne ispravke — 16.10.2026.

Result: PASS za lokalnu implementaciju; BLOCKED za potvrdu produkcionog backend toka.
Ticket: korisnički zahtev „Stitch UI/core fixes“ (nema dodeljenog SMP broja).
Role: Builder → nezavisni Reviewer → lokalni QA.
Branch: `codex/stitch-functional-redesign`.
Osnova: `main`, `13619356ddbec8972950ca958b2f0776d54ba708`.

Izmene nisu pushovane, mergovane niti deployovane. Produkciona šema, RLS i podaci nisu menjani. Handover dokument je korišćen kao istorijski kontekst; repo SMP2 je izvor istine.

## Arhitektura i primena dizajna

Zadržani su React 18, TypeScript, Vite, Tailwind, TanStack Query, Zod i Supabase JS. HashRouter i relativni Vite base ostaju zbog GitHub Pages. Auth → HouseholdProvider → zajednički AppShell → stranice; upiti i mutacije ostaju ograničeni na `household_id`.

Oba korisnička ZIP-a pregledana su kao vizuelne reference. Primenjeni su Inter, topla pozadina, zelena paleta, kartice, zajedničke kontrole, desktop navigacija, mobilna donja navigacija, prikaz plana, recepata, kupovine, zaliha i naloga. Dodati su dijalozi sa Escape/fokusom i svetla/tamna tema sa pamćenjem izbora.

Namerno nisu preuzeti statični korisnici, fotografije jela, procenat „frižider pun“, status „sinhronizovano“, izmišljeni nutritivni podaci, obaveštenja ili dugmad bez implementacije. Brojevi u aplikaciji računaju se iz vraćenih podataka. Mobilne kontrole porcija su veće od referentnih radi upotrebljivosti.

## Šta je promenjeno

| Oblast             | Implementirano lokalno                                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recepti            | Detalj recepta, skaliranje sastojaka po porcijama, pretraga naziva/oznaka/sastojaka, filter obroka i do 30 min; učitavanje i greške odvojeni od prazne zbirke.                                                                                                                                          |
| Editor             | Recept, koraci i sastojci čuvaju se jednim korisničkim korakom. Uklonjene mutacije na svaki unos. Validacija odbija prazna imena, negativna vremena i nevažeće porcije/količine. Sačuvani podaci se ponovo ispravno učitavaju pri uređivanju; prekid tokom čuvanja je blokiran.                         |
| Brisanje recepta   | Potvrda pre zahteva; greška stranog ključa prikazuje objašnjenje umesto lažnog uspeha. Stvarno FK ponašanje zavisi od baze.                                                                                                                                                                             |
| Plan               | Ponedeljak–nedelja, izbor recepata po obroku, promena porcija, uklanjanje i zajednička izabrana nedelja za kupovinu. Sam pregled prazne nedelje više ne pravi plan u bazi. UTC aritmetika sprečava pomeranje datuma oko DST-a.                                                                          |
| Zalihe             | Dodavanje, izmena, uklanjanje, decimalni zarez, minimum i rok. Dodavanje postojeće namirnice sabira kompatibilne jedinice uz proveru konkurentne izmene, čuva najraniji poznati rok i prevodi uneti minimum u postojeću jedinicu.                                                                       |
| Kupovina           | Jedan obračun iz plana, proporcionalan porcijama; g/kg i ml/l; zalihe se troše u obračunu jednom, uz rok prema datumu obroka. Ponovni obračun ažurira preostalu količinu umesto ponovnog dodavanja. Ručne i kupljene stavke ostaju; uklanjaju se samo suvišne nečekirane stavke iz plana.               |
| Kupljeno i zalihe  | Označavanje „kupljeno“ ne menja zalihe. Ako je kupljena stavka već ručno uneta u frižider, korisnik to potvrđuje pri obračunu da se ne oduzme dvaput. Ovaj izbor se ne čuva trajno posle napuštanja stranice.                                                                                           |
| Veće zbirke        | Paginirani recepti, pretraga sastojaka, zalihe i podaci za obračun. Generator čita samo planirane recepte, a katalog sastojaka u grupama.                                                                                                                                                               |
| Auth i domaćinstvo | Synchronous Auth subscription bez upita u callbacku, otkazivanje zastarelih rezultata članstva i čišćenje Query cache-a pri promeni identiteta. Potvrđena email adresa potrebna je za legacy claim; uski filteri čuvaju postojeću ulogu/domaćinstvo. Ponovno čitanje članstva rešava konkurentni claim. |
| UI                 | Prijava/registracija, jasne greške, prikaz lozinke, prazna stanja, mobilni plan bez horizontalnog skrola, dostupne oznake, fokus i donja navigacija; tamna tema bez starih svetlih body klasa.                                                                                                          |

## Provera

- `npm ci`: uspešno.
- `npm run lint`: uspešno, 0 grešaka; 2 React Fast Refresh upozorenja zbog hook i component exporta iz postojećih provider modula.
- `npm test`: 15/15. Pokriveni DST/godina/prestupna godina, konverzije, ponovni obračun, promena porcija, čuvanje ručnih/kupljenih stavki, uklanjanje zastarelih stavki, rokovi, alokacija zaliha, eksplicitno usklađivanje kupljenog sa zalihama, validacija, 1201 red paginacije i negativni uslovi za claim pozivnice.
- `npm run build`: uspešno. Postoje upozorenja za zastareli Browserslist i JS chunk preko 500 kB; nisu sakrivena podizanjem limita.
- Nezavisni Reviewer: PASS za lokalni obim, nakon ponovnog pregleda ispravki. Ovo nije odobrenje produkcionih RLS pravila.
- Browser QA koristi odvojenu memorijsku API zamenu: pogrešna/ispravna prijava; dodavanje obroka; promena porcija; pretraga sastojka; novi recept sa sastojkom; izmena, čuvanje i ponovno otvaranje editora; generisanje i ponavljanje kupovine bez dupliranja; kupljene i ručne stavke; decimalna zaliha; Escape i vraćanje fokusa; tema posle reload-a. Dodatno je potvrđeno sabiranje 0,5 kg + 300 g = 0,8 kg, prevođenje minimuma 100 g u 0,1 kg i čuvanje unetog roka. Konzola pregledane završne desktop sesije nema error zapise.
- Renderovan desktop i mobilni sadržaj na 393×650 i 360×650 CSS px; vizuelni dokazi su u `design-qa.md`. Mobilni prikaz je pravi responsive sadržaj u browser iframe-u, nije dokaz rada na fizičkom telefonu.
- ARTEMIS je korišćen za početno posmatranje javnog auth ekrana. Automatizovani tok nije završen zbog grešaka servisa/kvote i timeout-a. Android end-to-end prolaz se ne tvrdi.

## Supabase i uslovi pre produkcije

Kod i GitHub Pages workflow referenciraju projekat `roaqvlxnzlzvhksxtqip`. MCP veza nema dozvolu za taj projekat. Nisu potvrđeni efektivni RLS, kolone, server funkcije, triggeri, Auth redirect podešavanja ili ponašanje dva stvarna korisnika. Frontend filter nije sigurnosna granica; izolaciju mora garantovati baza.

Pre release-a proveriti, ovim redom:

1. Pristup pravom projektu i read-only inventar šeme/politika. Potvrditi da anon nema CRUD nad privatnim tabelama; proveriti korisnika A naspram domaćinstva B, član naspram vlasnika, neprijavljenog korisnika i opozvano članstvo.
2. `create_household`, njegove grantove i SECURITY DEFINER/search_path; owner članstvo mora nastati atomarno. U repou nije potpuna reprodukcija te funkcije i produkcionih triggera.
3. Pozivnice sa postojećim/novim nalogom, potvrđenim/nepotvrđenim/pogrešnim emailom, već povezanim `user_id`, već aktivnim statusom i dva taba. RLS mora sprečiti promenu uloge ili pristup tuđem domaćinstvu čak i direktnim API pozivom. UI ne šalje email pozivnice.
4. Jedinstvenost nedeljnog plana/listе i termina `(meal_plan_id, date, meal_type)`. Frontend više ne zavisi od nedokazanog `on_conflict`, ali read-then-insert bez server constraint-a nije bezbedan od duplikata između uređaja.
5. Recept i sastojke, kao i kompletan obračun kupovine, preneti u proverene transakcijske RPC-jeve. Sada su to višestruki zahtevi: delimičan neuspeh i konkurentne izmene mogu ostaviti delimičan rezultat. Retry čuva poznate ID-jeve, ali izgubljen odgovor na insert nije potpuno rešen bez server idempotency mehanizma.
6. Potvrditi FK ponašanje pri brisanju recepta, claim i Auth callback na stvarnom Pages URL-u, zatim testirati dva naloga/uređaja.

Legacy `digest(text, unknown)` greška nije reprodukovana u SMP2 kodu: ovaj UI nema token-invite RPC tok iz starog Vercel screenshota. Ne menjati pgcrypto/search_path naslepo. Povezanost `eta-eight.vercel.app` sa SMP2 nije potvrđena; repo trenutno ima GitHub Pages workflow.

## Preostali obim / preporučeni sledeći koraci

P0: pristup i izolacija stvarne baze, funkcije i pozivnice. P1: transakcije/konkurentnost i staging test sa dva korisnika. P2: code splitting, dependency/CI održavanje, uklanjanje istorijski praćenih `node_modules` i `dist` iz Git-a kao odvojena izmena. Lokalni build je regenerisao `dist/index.html`; to je generisani rezultat, a ne ručno izmenjen izvor ili deployment. PWA/offline, nutritivni obračun, fotografije, automatsko prebacivanje kupljenog u zalihe i reset lozinke nisu dodati ovim paketom. Back/forward pri nesnimljenom editoru nema potpunu route blokadu; postoje upozorenje pri napuštanju dokumenta i potvrda za klikove na linkove/otkazivanje.

Model zaliha ima jednu objedinjenu stavku po namirnici, bez odvojenih nabavnih lotova. Obračun ne rezerviše zalihe između različitih nedelja; svaka lista se obračunava iz tadašnjih zaliha. Stvarna sinhronizacija preko uređaja nije zamenjena statičnom oznakom „sinhronizovano“.

## Lokalni pregled i povratak

`npm run preview:local` pokreće UI na `http://localhost:5174/` i memorijski API na `127.0.0.1:54399`. Prijava: `pregled@primer.rs` / `Pregled123!`. API nije produkcioni server, ne šalje email i resetuje podatke pri restartu. Ne koristiti ga za stvarne podatke.

Za razvoj sa stvarnim backendom koristiti `npm run dev` i postojeće `.env.example` podešavanje. Service-role ključ se nikada ne stavlja u frontend.

Nema migracije za vraćanje: produkcija nije menjana. Lokalne izmene su izdvojene na navedenoj grani; za prekid pregleda zaustaviti lokalni proces. Ne odbacivati korisničke izmene komandama za hard reset.

Next owner/action: proveriti lokalni dizajn, zatim obezbediti autorizovan pristup stvarnom Supabase projektu za navedene release provere. Bez toga se lokalni PASS ne pretvara u potvrdu da produkcioni tok radi.

## Dopuna: emulator, boje i lokalna PWA instalacija

Korisnik je prijavio boje i nedostupnu lokalnu instalaciju. Stvarni ekran emulatora `emulator-5554` pokazao je staru objavljenu adresu `https://shurexbrt.github.io/SMP2/#/inventory`, sa starim zaglavljem i neutralnom paletom. Novi UI nije bio deployovan. Otvoren je odvojen lokalni Chrome tab preko ADB reverse portova 5174/54399, bez odjavljivanja produkcionog naloga. U lokalnom tabu potvrđen je novi izgled; dodatna izmena palete nije bila potrebna.

Naknadno je dodata osnovna PWA instalacija (prethodni odeljak o nedodatom PWA-u opisuje stanje pre ove dopune): relativni manifest/id/scope/start_url za localhost i `/SMP2/`, ikone 192/512/maskable/apple iz postojećeg Lucide CookingPot simbola uz ISC licencu, rani `beforeinstallprompt` listener, Account install UI i mrežni service worker. Privatne stranice i API/Auth odgovori se ne keširaju; nema offline čuvanja izmena ili sinhronizacije.

QA: emulator Chrome je prikazao meni „Install app“ i stvarni native dijalog sa nazivom, ikonom i `http://localhost:5174`. Puna WebAPK instalacija i standalone pokretanje nisu potvrđeni; ne zaključivati to iz samog browser događaja. Korisnik je nastavio da koristi lokalni tab, pa dalje UI akcije nisu forsirane.

Odvojeni build sa test env podešavanjem i browser na portu 5176: login → zaustavljanje samo tog preview servera → reload → offline ekran → restart servera → „Pokušaj ponovo“ vraća login. Prvi pokušaj izolovanog preview-a bez env vrednosti imao je očekivanu missing-env grešku; zatim je napravljen poseban build sa memorijskim API-jem, bez kontaktiranja produkcije.

Provere posle dopune: 18/18 testova, lint bez grešaka uz prethodna 2 upozorenja, build uspešan uz prethodno chunk upozorenje. Tri nova testa proveravaju manifest/icon dimenzije i relativne putanje, nepresretanje API/Auth/asset zahteva i offline odgovor bez keširanih privatnih podataka. Nezavisni Reviewer PASS nakon ispravke offline retry linka u pravo ponovno učitavanje.

Dokazi: `C:/Users/Admin/.codex/visualizations/2026/10/16/01a1436b-6c70-74c1-b107-9ecc86a67433/smp2-pwa/` (`01-local-dark-recipes.jpg`, `02-install-dialog.jpg`, `03-offline.png`, `04-reconnected.png`). Objavljivanje i baza i dalje nisu menjani. Za ponovno lokalno testiranje ostaje `npm run preview:local`; probni podaci se brišu restartom tog procesa.
