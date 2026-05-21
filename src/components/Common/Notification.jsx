import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Notification.css';

export default function Notification({ message, type = 'info', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message || !onClose || duration <= 0) return undefined;

    const timeout = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, message, onClose]);

  if (!message) return null;

  return createPortal(
    <div className={`notification notification-${type}`} role="status" aria-live="polite">
      <span className="notification-message">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss notification">
          &times;
        </button>
      )}
      {duration > 0 && (
        <span
          className="notification-progress"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>,
    document.body
  );
}
