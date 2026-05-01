import { API_BASE_URL } from '../config';

/** Same files as `public/marketing/` on the Next.js site (logo, banners, shop-by-age art). */
export function marketingUri(filename: string): string {
  const name = filename.replace(/^\//, '');
  return `${API_BASE_URL}/marketing/${name}`;
}

export const MARKETING = {
  logo: 'logo.png',
  /** Same asset as web auth pages (`utils/images/logo2.jpg` copied to `public/marketing/`). */
  loginBanner: 'login-banner.jpg',
  banners: ['banner1.png', 'banner2.jpg', 'banner3.jpg'] as const,
  shopByAge: {
    newborn: 'newborn.png',
    infants: 'infants.png',
    toddler: 'toddler.png',
    juniors: 'juniors.png',
  } as const,
};
