import { notFound } from 'next/navigation';

// Unknown paths under a locale render the localized not-found page (spec LPE4).
export default function CatchAllPage() {
  notFound();
}
