import { useEffect, useState } from 'react';
import LeftNavbar from '../layout/LeftNavbar';
import DashboardChart from '../Common/DashboardChart';
import { getStudentMonitoring, getAttendance, getMySessions } from '../../services/api';
import CheckinModal from '../modal/CheckinModal';
import CreatePrivateSessionModal from '../modal/CreatePrivateSessionModal';
import AboutModal from '../modal/AboutModal';
import InfoModal from '../modal/InfoModal';
import Notification from '../Common/Notification';
import SelfMonitoring from '../Pages/SelfMonitoring';
import { icons } from '../icon';
import { getSessionParticipants } from '../../utils/sessionDetails';
import Profile from '../Common/Profile';

export default function StudentDashboard({ userName, userRole, onLogout, userData, onUserUpdate }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({ total: 0, regular: 0, private: 0, lab1: 0, lab2: 0, lab3: 0 });
  const [checkinModal, setCheckinModal] = useState({ show: false, monitoringId: null });
  const [privateModal, setPrivateModal] = useState(false);
  const [privateRefreshKey, setPrivateRefreshKey] = useState(0);
  const [aboutModal, setAboutModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const studentId = userData?.users_id || userData?.user_id || userData?.id;

  const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getSessionDateKey = (session) => {
    const raw =
      session?.session_date ||
      session?.date ||
      session?.created_at ||
      '';
    return String(raw).slice(0, 10);
  };

  const normalizeMySession = (session) => ({
    ...session,
    monitoring_id: session.monitoring_id || session.session_id || session.id,
    created_at: session.created_at || session.session_date || session.date || '',
    session_date: session.session_date || session.created_at || session.date || '',
    start_time_formatted: session.start_time_formatted || session.start_time || '',
    end_time_formatted: session.end_time_formatted || session.end_time || '',
    can_checkin: session.can_checkin ?? false,
    attended: session.attended ?? true,
  });

  const getSessionCreator = (session) =>
    session.display_name ||
    session.creator_name ||
    session.instructor_name ||
    session.created_by ||
    session.creator?.name ||
    session.creator ||
    session.creator_id ||
    session.instructor_name ||
    session.user_name ||
    session.user?.name ||
    session.user?.display_name ||
    session.name ||
    'Unknown';

  const getSessionRole = (session) =>
    session.creator_role ||
    session.role ||
    session.user_role ||
    session.instructor_role ||
    session.role_name ||
    session.user?.role ||
    session.creator?.role ||
    (session.instructor_id ? 'Instructor' : session.creator_id || session.private_creator_id ? 'Student' : 'Student');

  const getSessionTitle = (session) =>
    session.title ||
    session.session_title ||
    session.private_title ||
    session.name ||
    session.display_name ||
    'Untitled';

  const isPrivateSession = (session) => {
    const type = String(
      session.session_type ||
      session.session_title ||
      session.title ||
      ''
    ).toLowerCase();

    return (
      type.includes('private') ||
      Boolean(
        session.private_title ||
          session.is_private ||
          session.private ||
          session.privacy === 'private'
      )
    );
  };

  const getSessionState = (session) => {
    if (session.attended) return 'checked';
    if (session.can_checkin) return 'checkin';

    try {
      const dateKey = getSessionDateKey(session);
      const end = session.end_time || session.end_time_formatted || '00:00:00';
      const endDateTime = new Date(`${dateKey}T${end}`);
      if (!Number.isNaN(endDateTime.getTime()) && endDateTime < new Date()) {
        return 'ended';
      }
    } catch {
      // fallback below
    }

    return 'upcoming';
  };

  const navButtons = [
    { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
    { id: 'lab1', label: 'LAB 1', icon: 'L1' },
    { id: 'lab2', label: 'LAB 2', icon: 'L2' },
    { id: 'lab3', label: 'LAB 3', icon: 'L3' },
    { id: 'create', label: 'Create', icon: '+' },
    { id: 'about', label: 'About Us', icon: 'i' },
  ];

  const loadData = async (lab = 'all') => {
    setLoading(true);

    try {
      const [data, mySessionsData] = await Promise.all([
        getStudentMonitoring(lab),
        getMySessions(),
      ]);
      const apiSessions = Array.isArray(data) ? data : [];
      const todayKey = getLocalDateKey();

      const mySessions = Array.isArray(mySessionsData)
        ? mySessionsData
        : Array.isArray(mySessionsData?.data)
        ? mySessionsData.data
        : Array.isArray(mySessionsData?.sessions)
        ? mySessionsData.sessions
        : [];

      const myPrivateSessions = mySessions
        .filter(isPrivateSession)
        .map(normalizeMySession)
        .filter((session) => (lab === 'all' ? true : String(session.lab_id) === String(lab)));

      const regularTodaySessions = apiSessions.filter(
        (session) => !isPrivateSession(session) && getSessionDateKey(session) === todayKey
      );
      const privateFromApi = apiSessions.filter(isPrivateSession);

      const privateSessionKeys = new Set();
      privateFromApi.forEach((session) => {
        privateSessionKeys.add(
          String(session.monitoring_id || session.session_id || session.id || `${session.lab_id}-${session.session_date}-${session.start_time}`)
        );
      });
      myPrivateSessions.forEach((session) => {
        privateSessionKeys.add(
          String(session.monitoring_id || session.session_id || session.id || `${session.lab_id}-${session.session_date}-${session.start_time}`)
        );
      });

      const privateMap = new Map();
      [...privateFromApi, ...myPrivateSessions].forEach((session) => {
        const key = String(
          session.monitoring_id ||
            session.session_id ||
            session.id ||
            `${session.lab_id}-${session.session_date || session.created_at}-${session.start_time}`
        );
        if (!privateMap.has(key)) {
          privateMap.set(key, session);
        }
      });

      const visibleSessions = [...regularTodaySessions, ...privateMap.values()].sort((a, b) => {
        const aDate = new Date(`${getSessionDateKey(a)}T${a.start_time || a.start_time_formatted || '00:00:00'}`);
        const bDate = new Date(`${getSessionDateKey(b)}T${b.start_time || b.start_time_formatted || '00:00:00'}`);
        return bDate - aDate;
      });

      setSessions(visibleSessions);

      const privateAvail = privateSessionKeys.size;
      const regularAvail = regularTodaySessions.length;
      const lab1Avail = visibleSessions.filter((session) => session.lab_id == 1).length;
      const lab2Avail = visibleSessions.filter((session) => session.lab_id == 2).length;
      const lab3Avail = visibleSessions.filter((session) => session.lab_id == 3).length;

      setStats({
        total: visibleSessions.length,
        regular: regularAvail,
        private: privateAvail,
        lab1: lab1Avail,
        lab2: lab2Avail,
        lab3: lab3Avail
      });
    } catch (err) {
      console.error('Failed to load student monitoring', err);
      setSessions([]);
      setStats({ total: 0, regular: 0, private: 0, lab1: 0, lab2: 0, lab3: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activePage === 'dashboard') loadData('all');
    else if (activePage.startsWith('lab')) loadData(activePage.replace('lab', ''));
  }, [activePage]);

  useEffect(() => {
    if (selectedSession) {
      getAttendance(selectedSession.monitoring_id || selectedSession.id)
        .then((data) => setAttendanceList(data.attendance || data.students || data || []))
        .catch(() => setAttendanceList([]));
    } else {
      setAttendanceList([]);
    }
  }, [selectedSession]);

  const handleButtonClick = (id) => {
    if (id === 'private') {
      setActivePage('private');
      return;
    }
    if (id === 'about') setAboutModal(true);
    else setActivePage(id);
  };

  const handleOpenPrivate = () => {
    setActivePage('private');
  };

  const refreshSessions = () => {
    if (activePage === 'dashboard') return loadData('all');
    if (activePage.startsWith('lab')) return loadData(activePage.replace('lab', ''));
    return loadData('all');
  };

  const handlePrivateSessionSuccess = async () => {
    setPrivateRefreshKey((prev) => prev + 1);
    setPrivateModal(false);
    setActivePage('private');
    await loadData('all');
    setNotice({ type: 'success', message: 'Private monitoring created successfully.' });
  };

  return (
    <div className="app-layout">
      <Notification
        message={notice?.message}
        type={notice?.type}
        onClose={() => setNotice(null)}
      />
      <LeftNavbar
        buttons={navButtons}
        activeButton={activePage}
        onButtonClick={handleButtonClick}
        onLogout={onLogout}
        userName={userName}
        userRole={userRole}
        onCreatePrivate={handleOpenPrivate}
        onProfileClick={() => setActivePage('profile')}
        profilePicture={userData?.profile_picture}
      />

      <div className="right-content">
        <div className="top-brand">
          <div className="top-brand-mark">
            <img
              src="/img/462563031_1242485170222250_2903697580110087068_n-removebg-preview.png"
              alt="OMSC Logo"
              className="top-brand-logo"
            />
            <div className="top-brand-copy">
              <h1>Laboratory Monitoring System</h1>
            </div>
          </div>
        </div>

        {activePage === 'private' && (
          <>
            <div className="page-actions">
              <button className="btn-save" onClick={() => setPrivateModal(true)}>
                <img src={icons.add} alt="Add" className="action-icon" />
                Create Private Monitoring
              </button>
            </div>
            <SelfMonitoring refreshKey={privateRefreshKey} />
          </>
        )}

        {activePage === 'dashboard' && (
          <>
            <div className="stats-grid">
              {[
                { label: 'Total Available Sessions', value: stats.total },
                { label: 'Regular Sessions', value: stats.regular },
                { label: 'Private Sessions', value: stats.private },
                { label: 'Lab 1 Sessions', value: stats.lab1 },
                { label: 'Lab 2 Sessions', value: stats.lab2 },
                { label: 'Lab 3 Sessions', value: stats.lab3 },
              ].map((stat) => (
                <div key={stat.label} className="small-stat-card">
                  <div className="stat-label">{stat.label}</div>
                  <div className="stat-value">{stat.value}</div>
                </div>
              ))}
            </div>
            <DashboardChart
              title="Available Sessions by Lab"
              type="bar"
              data={[
                { label: 'Lab 1', value: stats.lab1, color: '#2a2f9b' },
                { label: 'Lab 2', value: stats.lab2, color: '#ea580c' },
                { label: 'Lab 3', value: stats.lab3, color: '#c026d3' },
              ]}
            />
            <DashboardChart
              title="Session Types"
              type="donut"
              data={[
                { label: 'Regular', value: stats.regular, color: '#0f766e' },
                { label: 'Private', value: stats.private, color: '#7c3aed' },
              ]}
            />
          </>
        )}

        {(activePage === 'dashboard' || activePage.startsWith('lab')) && (
          <>
            {activePage.startsWith('lab') && (
              <h2 style={{ color: 'white', marginBottom: 24 }}>{activePage.toUpperCase()}</h2>
            )}

            <div className="sessions-list">
              {loading ? (
                <div style={{ color: 'white' }}>Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div style={{ color: 'white' }}>No upcoming sessions available.</div>
              ) : (
                sessions.map((session) => {
                  const isPrivate = isPrivateSession(session);
                  return (
                    <div
                      key={session.monitoring_id}
                      className={`session-card ${isPrivate ? 'private-card' : 'regular-card'}`}
                    >
                      <div className="session-info">
                        <div className="session-title-row">
                          <h3>{session.lab_name || `Lab ${session.lab_id}`}</h3>
                          <span className={`session-badge ${isPrivate ? 'private' : 'regular'}`}>
                            <img
                              src={isPrivate ? icons.privateSession : icons.regularSession}
                              alt={isPrivate ? 'Private' : 'Regular'}
                              className="badge-icon"
                            />
                            {isPrivate ? 'Private' : 'Regular'}
                          </span>
                        </div>
                        <p>
                          DATE: {session.created_at} | TIME:{' '}
                          {session.start_time_formatted || session.start_time} -{' '}
                          {session.end_time_formatted || session.end_time}
                        </p>
                        <p className="session-creator">
                          <img src={icons.profile} alt="Creator" className="meta-icon" />
                          Creator: {getSessionCreator(session)}
                        </p>
                      </div>

                      <div className="session-actions">
                      {isPrivate && (
                        <button className="btn-view" onClick={() => setSelectedSession(session)}>
                          <img src={icons.view} alt="View" className="action-icon" />
                        </button>
                      )}
                      {getSessionState(session) === 'checked' ? (
                        <button className="btn-checked" disabled>
                          Checked
                        </button>
                      ) : getSessionState(session) === 'checkin' ? (
                        <button
                          className="btn-checkin"
                          onClick={() =>
                            setCheckinModal({
                              show: true,
                              monitoringId: session.monitoring_id,
                            })
                          }
                        >
                          Check in
                        </button>
                      ) : getSessionState(session) === 'ended' ? (
                        <button className="btn-checked" disabled>
                          Ended
                        </button>
                      ) : (
                        <button className="btn-checked" disabled>
                          Upcoming
                        </button>
                      )}
                    </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {activePage === 'profile' && (
          <Profile userName={userName} userRole={userRole} userData={userData} onLogout={onLogout} onUserUpdate={onUserUpdate} />
        )}
      </div>

      <CheckinModal
        show={checkinModal.show}
        monitoringId={checkinModal.monitoringId}
        studentId={studentId}
        onClose={() => setCheckinModal({ show: false, monitoringId: null })}
        onCheckinSuccess={refreshSessions}
      />
      <CreatePrivateSessionModal
        show={privateModal}
        onClose={() => setPrivateModal(false)}
        creatorId={studentId}
        onSuccess={handlePrivateSessionSuccess}
      />
      <InfoModal
        show={Boolean(selectedSession)}
        title="Session Details"
        rows={
          selectedSession
            ? [
                ...(isPrivateSession(selectedSession) || getSessionTitle(selectedSession) !== 'Untitled'
                  ? [{ label: 'Title', value: getSessionTitle(selectedSession) }]
                  : []),
                { label: 'Lab', value: selectedSession.lab_name || `Lab ${selectedSession.lab_id}` },
                { label: 'Date', value: selectedSession.created_at || selectedSession.session_date },
                {
                  label: 'Time',
                  value: `${selectedSession.start_time_formatted || selectedSession.start_time || '-'} - ${
                    selectedSession.end_time_formatted || selectedSession.end_time || '-'
                  }`,
                },
                { label: 'Role', value: getSessionRole(selectedSession) },
                { label: 'Creator', value: getSessionCreator(selectedSession) },
                {
                  label: 'Participants',
                  type: 'participants',
                  value: getSessionParticipants(attendanceList, selectedSession),
                },
              ]
            : []
        }
        onClose={() => setSelectedSession(null)}
      />
      <AboutModal show={aboutModal} onClose={() => setAboutModal(false)} />
    </div>
  );
}
