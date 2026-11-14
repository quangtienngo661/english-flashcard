export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  indexable: process.env.NEXT_PUBLIC_INDEXABLE === 'true',
  // The two addresses of the Terms and the Privacy Policy (owner 05/11/2026): general questions, and help with an order, data or a complaint.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'contact@wordmet.com',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@wordmet.com',
};
