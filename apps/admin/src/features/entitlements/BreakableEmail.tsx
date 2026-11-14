/** An email (or a user label) that wraps before the `@` first, so a narrow table cell does not cut the domain in the middle of a word. */
export function BreakableEmail({ email }: { email: string }) {
  const at = email.indexOf('@');
  if (at <= 0) return <>{email}</>;
  return (
    <>
      {email.slice(0, at)}
      <wbr />
      {email.slice(at)}
    </>
  );
}
