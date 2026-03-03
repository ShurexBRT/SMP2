# Supabase Functions

## invite-member
Purpose: household owner invites partner by email.

### Deploy
Using Supabase CLI:
```bash
supabase functions deploy invite-member
```

### Secrets
Set:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
Optionally:
- SUPABASE_ANON_KEY (only used to validate JWT; can be omitted if you change userClient creation)

Example:
```bash
supabase secrets set SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." SUPABASE_ANON_KEY="..."
```
