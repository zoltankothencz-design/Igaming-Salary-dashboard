// Vercel serverless function — server-side only, never exposed to the browser.
// Reads GITHUB_PAT from Vercel environment variables and dispatches the salary scan workflow.
// The client never sees the token; it only POSTs to /api/trigger-scan.

const REPO = 'zoltankothencz-design/Igaming-Salary-dashboard';
const WORKFLOW = 'salary-scan.yml';
const ALLOWED_ORIGIN = 'https://igaming-salary-dashboard.vercel.app';

export default async function handler(req, res) {
  // CORS: only allow requests from our own Vercel deployment
  const origin = req.headers.origin || '';
  if (origin && origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_PAT;
  if (!token) {
    return res.status(503).json({ error: 'Scan trigger not configured (GITHUB_PAT env var missing).' });
  }

  const ghRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );

  if (ghRes.status === 204) {
    return res.status(200).json({ ok: true, message: 'Scan queued.' });
  }

  const text = await ghRes.text();
  return res.status(ghRes.status).json({ error: `GitHub API error ${ghRes.status}: ${text}` });
}
