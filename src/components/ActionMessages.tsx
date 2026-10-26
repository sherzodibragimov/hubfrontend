import type { ActionMessage } from '../api/types';

export default function ActionMessages({ messages, onClose }: { messages: ActionMessage[]; onClose?: () => void }) {
  if (!messages.length) return null;
  const level = messages.some((m) => m.level === 'error') ? 'error' : messages.some((m) => m.level === 'warning') ? 'warn' : 'ok';
  return (
    <div className={`alert ${level}`}>
      {onClose && <button type="button" className="alert-close" onClick={onClose} aria-label="Yopish">×</button>}
      <ul className="result-list">{messages.map((m, i) => <li key={i} className={`msg-${m.level}`}>{m.text}</li>)}</ul>
    </div>
  );
}
