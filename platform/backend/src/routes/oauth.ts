import { Router } from 'express';
import axios from 'axios';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { setAuthCookie, signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

export const oauthRouter = Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? '';
const FRONTEND_ORIGIN = (
  process.env.CORS_ORIGIN ?? 'http://localhost:3000'
).split(',')[0];

function b64url(buf: Buffer) {
  return buf
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

oauthRouter.get('/github/start', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    res.status(503).json({ error: 'github_oauth_not_configured' });
    return;
  }
  const state = b64url(crypto.randomBytes(16));
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
  });
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', GITHUB_CLIENT_ID);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);
  const redirectUri = req.query.redirect as string | undefined;
  if (redirectUri) {
    url.searchParams.set(
      'redirect_uri',
      `${new URL(redirectUri).origin}${new URL(redirectUri).pathname}`,
    );
  }
  res.redirect(url.toString());
});

oauthRouter.get('/github/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    const savedState = req.cookies?.oauth_state;
    if (!code || !state || !savedState || state !== savedState) {
      throw new HttpError(400, 'invalid oauth state');
    }
    res.clearCookie('oauth_state');

    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } },
    );
    const accessToken = tokenRes.data.access_token;
    if (!accessToken) throw new HttpError(400, 'token exchange failed');

    const [profileRes, emailsRes] = await Promise.all([
      axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios
        .get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .catch(() => ({ data: [] as any[] })),
    ]);
    const profile = profileRes.data;
    const primaryEmail =
      (emailsRes.data as any[]).find((e) => e.primary && e.verified)?.email ??
      profile.email ??
      `${profile.login}@users.noreply.github.com`;
    const providerUid = String(profile.id);

    const existing = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUid: { provider: 'github', providerUid } },
      include: { user: true },
    });

    let user;
    if (existing) {
      user = existing.user;
    } else {
      // Try linking by email; otherwise create a new user.
      const byEmail = await prisma.user.findUnique({
        where: { email: primaryEmail },
      });
      if (byEmail) {
        user = byEmail;
      } else {
        const username = await uniqueUsername(
          profile.login ?? primaryEmail.split('@')[0],
        );
        user = await prisma.user.create({
          data: {
            email: primaryEmail,
            username,
            avatarUrl: profile.avatar_url,
          },
        });
      }
      await prisma.oAuthAccount.create({
        data: { userId: user.id, provider: 'github', providerUid },
      });
    }

    setAuthCookie(
      res,
      signToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }),
    );
    res.redirect(`${FRONTEND_ORIGIN}/problems`);
  } catch (e) {
    next(e);
  }
});

async function uniqueUsername(base: string): Promise<string> {
  const clean = base.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'user';
  let candidate = clean;
  let i = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    candidate = `${clean}${i}`;
    i++;
    if (i > 1000) {
      candidate = `${clean}${crypto.randomBytes(3).toString('hex')}`;
      break;
    }
  }
  return candidate;
}
