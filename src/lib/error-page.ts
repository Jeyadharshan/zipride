export function renderErrorPage(error?: any): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred during rendering.';
  const stack = error instanceof Error ? error.stack : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Application Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #0f172a;
          color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
        }
        .container {
          max-width: 600px;
          width: 100%;
          background-color: #1e293b;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
          border: 1px solid #334155;
        }
        h1 {
          font-size: 24px;
          font-weight: 700;
          color: #ef4444;
          margin-top: 0;
          margin-bottom: 16px;
        }
        p {
          font-size: 16px;
          line-height: 1.6;
          color: #cbd5e1;
          margin-bottom: 24px;
        }
        .error-details {
          background-color: #0f172a;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 16px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 14px;
          color: #f87171;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .actions {
          margin-top: 24px;
          display: flex;
          gap: 12px;
        }
        .btn {
          display: inline-block;
          background-color: #3b82f6;
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: background-color 0.2s;
          border: none;
          cursor: pointer;
        }
        .btn:hover {
          background-color: #2563eb;
        }
        .btn-secondary {
          background-color: #475569;
        }
        .btn-secondary:hover {
          background-color: #334155;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Application Error</h1>
        <p>A server-side error occurred while rendering this page. Please try refreshing or return home.</p>
        ${message ? `<div class="error-details"><strong>Error:</strong> ${escapeHtml(message)}${stack ? `\n\n${escapeHtml(stack)}` : ''}</div>` : ''}
        <div class="actions">
          <button class="btn" onclick="window.location.reload()">Reload Page</button>
          <a href="/" class="btn btn-secondary">Go Home</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
