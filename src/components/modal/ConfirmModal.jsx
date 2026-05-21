import './Modals.css';

export default function ConfirmModal({
  show,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="modal-container confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose} disabled={loading} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="modal-actions confirm-actions">
          <button type="button" className="confirm-cancel-btn" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
          <button
            type="button"
            className={danger ? 'confirm-danger-btn' : 'btn-save'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
