import { useRef, useState } from 'react';
import { exportAll, importAll } from '../lib/api';
import { clearToken } from '../lib/auth';
import type { ExportPayload } from '../lib/types';

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      const payload = await exportAll<ExportPayload>();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracker-export-${payload.exported_at.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Export downloaded.');
    } catch (err: any) {
      setMessage(`Export failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await importAll(parsed);
      const upserted = Object.values(result.summary).reduce((s, v) => s + v.upserted, 0);
      setMessage(
        `Imported ${upserted} records.` + (result.errors.length ? ` Issues: ${result.errors.join('; ')}` : ''),
      );
    } catch (err: any) {
      setMessage(`Import failed: ${err.message}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="page">
      <h1>Settings</h1>
      <div className="panel">
        <h3>Data export &amp; restore</h3>
        <p className="muted">
          Export everything as a JSON file you keep yourself. Importing is safe to repeat -- records are
          matched by id, so re-importing the same file never creates duplicates.
        </p>
        <div className="inline-form">
          <button type="button" onClick={handleExport} disabled={busy}>
            Export all data (JSON)
          </button>
          <button type="button" onClick={handleImportClick} disabled={busy}>
            Import / restore from JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={handleFileChosen} />
        </div>
        {message && <p className="muted">{message}</p>}
      </div>

      <div className="panel">
        <h3>Access</h3>
        <button
          type="button"
          onClick={() => {
            clearToken();
            window.location.reload();
          }}
        >
          Lock app
        </button>
      </div>
    </div>
  );
}
