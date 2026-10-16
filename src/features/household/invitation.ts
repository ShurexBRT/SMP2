export function mayClaimInvitation(
  invite: { email: string; status: string; user_id: string | null },
  user: { id: string; email?: string; email_confirmed_at?: string }
) {
  return (
    !!user.id &&
    !!user.email_confirmed_at &&
    !!user.email &&
    invite.user_id === null &&
    invite.status === 'invited' &&
    invite.email.trim().toLowerCase() === user.email.trim().toLowerCase()
  );
}
