import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 単一ユーザー用の固定キー。複数人で使う場合はここをユーザーIDごとに分ける。
const KEY = 'inochi-no-tokei:state';

const DEFAULT_STATE = {
  birthDate: '1980-08-31',
  lifeExpAge: 81.09,
  targetAge: 100,
  dreams: [],
};

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await redis.get(KEY);
      return res.status(200).json(data || DEFAULT_STATE);
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'invalid body' });
      }
      await redis.set(KEY, body);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
}
