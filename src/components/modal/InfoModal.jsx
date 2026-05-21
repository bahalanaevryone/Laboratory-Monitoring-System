import './Modals.css';
import { icons } from '../icon';

const rowIconMap = {
  id: icons.idCard,
  'creator id': icons.idCard,
  name: icons.profile,
  creator: icons.profile,
  owner: icons.profile,
  email: icons.mail,
  'creator email': icons.mail,
  role: icons.role,
  lab: icons.lab,
  date: icons.calendar,
  time: icons.clock,
  title: icons.privateSession,
  participants: icons.users,
  'present students': icons.users,
};

export default function InfoModal({ show, title, rows = [], onClose }) {
  if (!show) return null;

  const participantRows = rows.filter((row) => row.type === 'participants');
  const detailRows = rows.filter((row) => row.type !== 'participants');

  const renderValue = (row) => {
    if (row.type === 'participants') {
      const people = Array.isArray(row.value) ? row.value : [];
      if (people.length === 0) {
        return <span className="participant-empty">No participants recorded yet.</span>;
      }

      return (
        <div className="participant-grid">
          {people.map((person, index) => (
            <div className="participant-card" key={`${person.name}-${person.pc || index}`}>
              <span className="participant-name">{person.name}</span>
              <span className="participant-pc">PC {person.pc || 'N/A'}</span>
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(row.value)) {
      return row.value.length > 0
        ? row.value.map((item, idx) => (
            <span key={idx}>
              {item}
              {idx < row.value.length - 1 ? <br /> : null}
            </span>
          ))
        : '-';
    }

    return row.value || '-';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="info-list">
            {participantRows.map((row) => (
              <div className="info-row info-row-featured" key={row.label}>
                <span className="info-label">
                  {(row.icon || rowIconMap[String(row.label).toLowerCase()]) && (
                    <img
                      src={row.icon || rowIconMap[String(row.label).toLowerCase()]}
                      alt={row.label}
                      className="info-label-icon"
                    />
                  )}
                  {row.label}
                </span>
                <span className={`info-value ${row.type === 'participants' ? 'info-value-participants' : ''}`}>
                  {renderValue(row)}
                </span>
              </div>
            ))}
            {detailRows.length > 0 && (
              <div className="info-detail-grid">
                {detailRows.map((row) => (
                  <div className="info-row info-row-compact" key={row.label}>
                    <span className="info-label">
                      {(row.icon || rowIconMap[String(row.label).toLowerCase()]) && (
                        <img
                          src={row.icon || rowIconMap[String(row.label).toLowerCase()]}
                          alt={row.label}
                          className="info-label-icon"
                        />
                      )}
                      {row.label}
                    </span>
                    <span className="info-value">
                      {renderValue(row)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
