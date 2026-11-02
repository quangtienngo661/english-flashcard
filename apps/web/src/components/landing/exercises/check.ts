/** A typed answer is right when it equals the answer after trimming and ignoring letter case (design landing-redesign §3.1). */
export function checkTyped(answer: string, input: string): boolean {
  const typed = input.trim().toLowerCase();
  return typed !== '' && typed === answer.trim().toLowerCase();
}
