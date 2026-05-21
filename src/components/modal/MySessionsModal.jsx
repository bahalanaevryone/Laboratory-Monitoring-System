import { useState, useEffect } from 'react';
import { getMySessions } from '../../services/api';

export default function MySessionsModal({ show, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setLoading(true);
      getMySessions()
        .then((data) => {
          const normalized = Array.isArray(data)
            ? data
            : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.sessions)
            ? data.sessions
            : [];
          setSessions(normalized);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>My Created Sessions</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : sessions.length === 0 ? (
            <p>You haven't created any private sessions yet.</p>
          ) : (
            sessions.map((session) => {
              const participants = Array.isArray(session.students)
                ? session.students
                    .map((item) =>
                      item.student_name ||
                      item.name ||
                      `${item.firstname || item.first_name || ''} ${item.lastname || item.last_name || ''}`.trim() ||
                      item.user?.name ||
                      item.user?.display_name ||
                      item.pc ||
                      ''
                    )
                    .filter(Boolean)
                    .join(', ')
                : session.students || session.participants || 'None';
              return (
                <div key={session.session_id || session.monitoring_id} className="session-item">
                  <h3>{session.title}</h3>
                  <p><strong>Lab:</strong> {session.lab_name || `Lab ${session.lab_id}`}</p>
                  <p><strong>Date:</strong> {session.session_date}</p>
                  <p><strong>Time:</strong> {session.start_time} – {session.end_time}</p>
                  <p><strong>Students Checked In:</strong> {session.total_students || 0}</p>
                  {participants && <p><strong>Participants:</strong> {participants}</p>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}