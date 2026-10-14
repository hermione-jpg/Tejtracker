import { useState } from 'react';
import type { ReactNode } from 'react';
import { getToken, setToken } from '../lib/auth';
import { verifyToken } from '../lib/api';

export function AccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => Boolean(getToken()));
  const [input, setInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (unlocked) return <>{children}</>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setChecking(true);
    setError(null);
    const ok = await verifyToken(input.trim());
    setChecking(false);
    if (ok) {
      setToken(input.trim());
      setUnlocked(true);
    } else {
      setError('That passcode was rejected. Check APP_ACCESS_TOKEN in your Vercel project settings.');
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={handleSubmit}>
        <h1>Tracker</h1>
        <p>Enter your passcode to continue.</p>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Passcode"
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={checking}>
          {checking ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
