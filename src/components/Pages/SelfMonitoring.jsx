import { useEffect, useState } from 'react';
import { getMySessions, deleteMonitoring } from '../../services/api';
import InfoModal from '../modal/InfoModal';
import ConfirmModal from '../modal/ConfirmModal';
import { icons } from '../icon';
import Notification from '../Common/Notification';
import { getSessionParticipants } from '../../utils/sessionDetails';

function getSessionStatus(sessionDate, endTime) {
  const now = new Date();

  try {
    const endDateTime = new Date(`${sessionDate}T${endTime}`);
    if (endDateTime < now) return 'Completed';

    const sessionDateOnly = new Date(`${sessionDate}T00:00:00`);
    const today = new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}T00:00:00`);

    if (sessionDateOnly.getTime() === today.getTime()) return 'In Progress';
    return 'Pending';
  } catch {
    return 'Pending';
  }
}

export default function SelfMonitoring({ refreshKey }) {
  const [monitoringRecords, setMonitoringRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [notice, setNotice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const normalizeSession = (session) => ({
    ...session,
    title:
      session.title ||
      session.session_title ||
      session.private_title ||
      session.name ||
      session.display_name ||
      'Private Session',
    lab_name: session.lab_name || (session.lab_id ? `Lab ${session.lab_id}` : session.lab),
    session_date: session.session_date || session.date || session.created_at || '',
    start_time:
      session.start_time ||
      session.start_time_formatted ||
      session.time_start ||
      session.begin_time ||
      '',
    end_time:
      session.end_time ||
      session.end_time_formatted ||
      session.time_end ||
      session.finish_time ||
      '',
    total_students: session.total_students || session.total || session.students?.length || 0,
    participants:
      Array.isArray(session.participants) && session.participants.length > 0
        ? session.participants
        : Array.isArray(session.students) && session.students.length > 0
        ? session.students
        : session.participant_list || session.student_list || [],
  });

  const loadSessions = async (mounted = true) => {
    setLoading(true);
    try {
      const data = await getMySessions();
      if (!mounted) return;
      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.sessions)
        ? data.sessions
        : [];
      const ordered = [...normalized]
        .map(normalizeSession)
        .sort((a, b) => {
          const dateA = new Date(`${a.session_date}T${a.start_time}`);
          const dateB = new Date(`${b.session_date}T${b.start_time}`);
          return dateB - dateA || (b.session_id ?? b.monitoring_id ?? 0) - (a.session_id ?? a.monitoring_id ?? 0);
        });
      setMonitoringRecords(ordered);
    } catch (err) {
      console.error('Failed to load self monitoring sessions', err);
      if (mounted) setMonitoringRecords([]);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMonitoring(deleteTarget.id);
      await loadSessions();
      setNotice({ type: 'success', message: 'Private monitoring deleted successfully.' });
      setDeleteTarget(null);
    } catch (err) {
      setNotice({ type: 'error', message: 'Failed to delete session.' });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    loadSessions(mounted);

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const getSessionCreator = (session) =>
    session.creator_name ||
    session.created_by ||
    session.user_name ||
    session.user?.name ||
    session.display_name ||
    session.name ||
    'Self';

  return (
    <div className="page-container">
      <Notification
        message={notice?.message}
        type={notice?.type}
        onClose={() => setNotice(null)}
      />
      <h1 className="page-title">Self Monitoring</h1>
      <div className="monitoring-records">
        {loading ? (
          <div>Loading your private sessions...</div>
        ) : monitoringRecords.length === 0 ? (
          <div>No self-monitoring sessions found yet.</div>
        ) : (
          <table className="monitoring-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Lab</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Participants</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {monitoringRecords.map((record) => {
                const status = getSessionStatus(record.session_date, record.end_time);
                return (
                  <tr key={record.session_id || record.monitoring_id || record.id}>
                    <td>
                      <div className="table-title-cell">
                        <span>{record.title}</span>
                        <span className="session-badge private">Private</span>
                      </div>
                    </td>
                    <td>{record.lab_name || `Lab ${record.lab_id}`}</td>
                    <td>{record.session_date}</td>
                    <td>
                      {record.start_time || record.start_time_formatted} - {record.end_time || record.end_time_formatted}
                    </td>
                    <td>
                      <span className={`status-${status.toLowerCase().replace(' ', '-')}`}>
                        {status}
                      </span>
                    </td>
                    <td>{record.total_students || (Array.isArray(record.participants) ? record.participants.length : 0) || 0}</td>
                    <td>
                      <button className="view-btn" onClick={() => setSelectedSession(record)}>
                        <img src={icons.view} alt="View" className="action-icon" />
                      </button>
                      <button
                        className="delete-btn icon-danger-btn"
                        onClick={() =>
                          setDeleteTarget({
                            id: record.monitoring_id || record.session_id || record.id,
                            title: record.title || 'Private Session',
                          })
                        }
                      >
                        <img src={icons.delete} alt="Delete" className="action-icon" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <InfoModal
        show={Boolean(selectedSession)}
        title={selectedSession ? selectedSession.title || 'Private Session Details' : 'Session Details'}
        rows={
          selectedSession
            ? [
                { label: 'Title', value: selectedSession.title || 'Private Session' },
                { label: 'Lab', value: selectedSession.lab_name || `Lab ${selectedSession.lab_id}` },
                { label: 'Date', value: selectedSession.session_date || selectedSession.created_at },
                {
                  label: 'Time',
                  value: `${selectedSession.start_time || selectedSession.start_time_formatted || '-'} - ${
                    selectedSession.end_time || selectedSession.end_time_formatted || '-'
                  }`,
                },
                { label: 'Creator', value: getSessionCreator(selectedSession) },
                {
                  label: 'Participants',
                  type: 'participants',
                  value: getSessionParticipants([], selectedSession),
                },
              ]
            : []
        }
        onClose={() => setSelectedSession(null)}
      />
      <ConfirmModal
        show={Boolean(deleteTarget)}
        title="Delete Private Monitoring"
        message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
