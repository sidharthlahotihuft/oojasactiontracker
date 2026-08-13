import {
  COOKIE_NAME,
  PASSWORD,
  SESSION_DAYS,
  USERNAME,
  safeEqual,
  sessionToken,
} from '../lib/auth.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== 'object') body = {};

  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');

  const valid =
    safeEqual(username.toLowerCase(), USERNAME.toLowerCase()) &&
    safeEqual(password, PASSWORD);

  if (!valid) {
    // Small fixed delay to make guessing slow and unattractive.
    await delay(500);
    return res
      .status(401)
      .json({ ok: false, error: 'Incorrect email or password.' });
  }

  const token = await sessionToken();
  const maxAge = SESSION_DAYS * 24 * 60 * 60;

  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
  );
  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({ ok: true });
}
