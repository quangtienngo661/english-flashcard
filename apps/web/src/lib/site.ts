export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  indexable: process.env.NEXT_PUBLIC_INDEXABLE === 'true',
  // ASSUMPTION: domain not bought yet (spec §12).
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@wordmet.com',
};
