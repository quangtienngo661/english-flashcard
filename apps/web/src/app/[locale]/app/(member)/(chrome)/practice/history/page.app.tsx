import { redirect } from 'next/navigation';
import { historyTarget } from './history-target';

// The practice history page became the study calendar and "Báo lỗi của tôi" moved to Settings (design §10.4, QR1): old links redirect.
export default async function Page({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') query.set(key, value);
  }
  redirect(historyTarget(locale, query));
}
