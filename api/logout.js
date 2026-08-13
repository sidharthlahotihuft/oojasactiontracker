import { COOKIE_NAME } from '../lib/auth.js';

export default function handler(req, res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  );
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', '/login');
  return res.status(302).end();
}
