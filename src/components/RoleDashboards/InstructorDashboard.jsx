import { useEffect, useState } from 'react';
import LeftNavbar from '../layout/LeftNavbar';
import {
  createMonitoring,
  deleteMonitoring,
  getStudentsBySection,
  getInstructorMonitoring,
  getAttendance,
} from '../../services/api';
import AboutModal from '../modal/AboutModal';
import CreatePrivateSessionModal from '../modal/CreatePrivateSessionModal';
import InfoModal from '../modal/InfoModal';
import ConfirmModal from '../modal/ConfirmModal';
import { icons } from '../icon';
import Notification from '../Common/Notification';
import { getSessionParticipants } from '../../utils/sessionDetails';
import Profile from '../Common/Profile';

export default function InstructorDashboard({ userName, userRole, onLogout, userData, onUserUpdate }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({ total: 0, myMonitoring: 0, myPrivate: 0 });
  const [loading, setLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    lab_id: '',
    session_date: '',
    start_time: '',
    end_time: '',
    total_pcs_count: 40,
    selectedPCs: [],
    course: '',
    year_level: '',
    section: '',
    hiddenStudents: [],
  });
  const [pcList, setPcList] = useState([]);
  const [matchingStudents, setMatchingStudents] = useState([]);
  const [showStudentRemover, setShowStudentRemover] = useState(false);
  const [privateModal, setPrivateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [notice, setNotice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const currentUserName = userData?.display_name || userData?.name || userName || 'Unknown';

  const getSessionCreator = (session) => {
    const explicitName =
      session.display_name ||
      session.creator_name ||
      session.created_by ||
      session.creator ||
      session.user_name ||
      session.name ||
      session.creator?.name ||
      `${session.first_name || session.creator_first_name || ''} ${session.last_name || session.creator_last_name || ''}`.trim();

    if (explicitName) return explicitName;

    if (
      session.created_by_id === userData?.users_id ||
      session.creator_id === userData?.users_id ||
      session.instructor_id === userData?.users_id
    ) {
      return currentUserName;
    }

    return 'Self';
  };

  const getSessionTitle = (session) =>
    session.title || session.session_title || session.private_title || 'Untitled';

  const getSessionRole = (session) =>
    session.role ||
    session.user_role ||
    session.creator_role ||
    session.instructor_role ||
    session.role_name ||
    session.user?.role ||
    session.creator?.role ||
    (session.instructor_id ? 'Instructor' : session.creator_id ? 'Student' : 'Unknown');

  const isPrivateSession = (session) => {
    const type = String(session.session_type || session.title || '').toLowerCase();
    return (
      type.includes('private') ||
      Boolean(session.private_title || session.is_private || session.private || session.privacy === 'private')
    );
  };

  const privateSessions = sessions.filter(isPrivateSession);

  const navButtons = [
    { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
    { id: 'lab1', label: 'LAB 1', icon: 'L1' },
    { id: 'lab2', label: 'LAB 2', icon: 'L2' },
    { id: 'lab3', label: 'LAB 3', icon: 'L3' },
    { id: 'create', label: 'Create', icon: '+' },
    { id: 'about', label: 'About Us', icon: 'i' },
  ];

  const loadSessions = async (lab = null) => {
    setLoading(true);

    try {
      const data = await getInstructorMonitoring();
      const filtered =
        lab && lab !== 'dashboard'
          ? data.filter((session) => session.lab_id == lab.replace('lab', ''))
          : data;

      setSessions(filtered);

      const privateCount = data.filter((session) => isPrivateSession(session)).length;
      setStats({
        total: data.length,
        myMonitoring: data.length - privateCount,
        myPrivate: privateCount,
      });
    } catch (err) {
      console.error('Failed to load instructor sessions', err);
      setSessions([]);
      setStats({ total: 0, myMonitoring: 0, myPrivate: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activePage === 'dashboard' || activePage.startsWith('lab') || activePage === 'private') {
      const loadArg = activePage.startsWith('lab') ? activePage : null;
      loadSessions(loadArg);
    }
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

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteMonitoring(deleteTarget.id);
      const loadArg = activePage.startsWith('lab') ? activePage : null;
      await loadSessions(loadArg);
      setNotice({ type: 'success', message: 'Session deleted successfully.' });
      setDeleteTarget(null);
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to delete session.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateChange = (e) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const generatePCs = () => {
    const count = Number(createForm.total_pcs_count) || 0;
    const pcs = Array.from({ length: count }, (_, index) => index + 1);
    setPcList(pcs);
    setCreateForm({ ...createForm, selectedPCs: pcs });
  };

  const togglePC = (pc) => {
    const selected = createForm.selectedPCs.includes(pc)
      ? createForm.selectedPCs.filter((value) => value !== pc)
      : [...createForm.selectedPCs, pc];

    setCreateForm({ ...createForm, selectedPCs: selected });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append('lab_id', createForm.lab_id);
      formData.append('session_date', createForm.session_date);
      formData.append('start_time', createForm.start_time);
      formData.append('end_time', createForm.end_time);
      formData.append('total_pcs_count', createForm.total_pcs_count);
      formData.append('pcs', JSON.stringify(createForm.selectedPCs));
      formData.append('created_by', userData?.users_id || '');
      formData.append('created_by_id', userData?.users_id || '');
      formData.append('creator_id', userData?.users_id || '');
      formData.append('creator_name', currentUserName);
      formData.append('display_name', currentUserName);
      formData.append('course', createForm.course);
      formData.append('year_level', createForm.year_level);
      formData.append('section', createForm.section);
      formData.append('hidden_students', JSON.stringify(createForm.hiddenStudents));

      const result = await createMonitoring(formData);
      if (!result.success) throw new Error(result.message || 'Failed to create session.');

      setCreateForm({
        lab_id: '',
        session_date: '',
        start_time: '',
        end_time: '',
        total_pcs_count: 40,
        selectedPCs: [],
        course: '',
        year_level: '',
        section: '',
        hiddenStudents: [],
      });
      setPcList([]);
      setActivePage('dashboard');
      await loadSessions();
      setNotice({ type: 'success', message: 'Session created successfully.' });
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to create session.' });
    }
  };

  const handleButtonClick = (id) => {
    if (id === 'private') {
      setActivePage('private');
    } else if (id === 'about') setActivePage('about');
    else setActivePage(id);
  };

  const handleCreateRegular = () => {
    setActivePage('create');
  };

  const loadMatchingStudents = async () => {
    if (!createForm.course || !createForm.year_level || !createForm.section) {
      setNotice({ type: 'error', message: 'Select course, year, and section first.' });
      return;
    }
    const students = await getStudentsBySection({
      course: createForm.course,
      year_level: createForm.year_level,
      section: createForm.section,
    });
    setMatchingStudents(students);
    setShowStudentRemover(true);
  };

  const toggleHiddenStudent = (usersId) => {
    const selected = createForm.hiddenStudents.includes(usersId)
      ? createForm.hiddenStudents.filter((id) => id !== usersId)
      : [...createForm.hiddenStudents, usersId];
    setCreateForm({ ...createForm, hiddenStudents: selected });
  };

  const handleCreatePrivate = () => {
    setActivePage('private');
  };

  const handlePrivateSessionSuccess = async () => {
    setPrivateModal(false);
    setActivePage('private');
    await loadSessions();
    setNotice({ type: 'success', message: 'Private monitoring created successfully.' });
  };

  const sessionRows = selectedSession
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
          label: isPrivateSession(selectedSession) ? 'Participants' : 'Present Students',
          type: 'participants',
          value: getSessionParticipants(attendanceList, selectedSession),
        },
      ]
    : [];

  if (activePage === 'about') {
    return (
      <div className="app-layout">
        <LeftNavbar
          buttons={navButtons}
          activeButton="about"
          onButtonClick={handleButtonClick}
          onLogout={onLogout}
          userName={userName}
          userRole={userRole}
          onCreateRegular={handleCreateRegular}
          onCreatePrivate={handleCreatePrivate}
          onProfileClick={() => setActivePage('profile')}
          profilePicture={userData?.profile_picture}
        />
        <div className="right-content">
          <AboutModal show={true} onClose={() => setActivePage('dashboard')} />
        </div>
      </div>
    );
  }

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
        onCreateRegular={handleCreateRegular}
        onCreatePrivate={handleCreatePrivate}
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

        {activePage === 'dashboard' && (
          <>
            <div className="stats-grid three-cols">
              <div className="stat-card">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.myMonitoring}</div>
                <div className="stat-label">Instructor Sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.myPrivate}</div>
                <div className="stat-label">Private Sessions</div>
              </div>
            </div>
            <div className="dashboard-graph">
              {[
                { label: 'Regular', value: stats.total - stats.myPrivate, color: '#0f766e' },
                { label: 'Private', value: stats.myPrivate, color: '#7c3aed' },
                { label: 'Total', value: stats.total, color: '#0284c7' },
              ].map((item) => (
                <div key={item.label} className="graph-card">
                  <div className="graph-label">{item.label}</div>
                  <div className="graph-bar">
                    <div
                      className="graph-bar-fill"
                      style={{ height: `${Math.min(item.value * 12, 100)}%`, background: item.color }}
                    />
                  </div>
                  <div className="graph-bar-title">{item.value}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {(activePage === 'dashboard' || activePage.startsWith('lab')) && (
          <>
            {activePage.startsWith('lab') && (
              <h2 style={{ color: 'white', marginBottom: 24 }}>{activePage.toUpperCase()}</h2>
            )}

            <div className="sessions-list">
              {loading ? (
                <div style={{ color: 'white' }}>Loading...</div>
              ) : sessions.length === 0 ? (
                <div style={{ color: 'white' }}>No sessions found.</div>
              ) : (
                sessions.map((session) => {
                  const isPrivate = isPrivateSession(session);
                  return (
                    <div
                      key={session.monitoring_id || session.id}
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
                          DATE: {session.created_at || session.session_date} | TIME:{' '}
                          {session.start_time} - {session.end_time}
                        </p>
                        <p className="session-creator">
                          <img src={icons.profile} alt="Creator" className="meta-icon" />
                          Creator: {getSessionCreator(session)}
                        </p>
                      </div>
                      <div className="session-actions">
                        <button className="btn-view" onClick={() => setSelectedSession(session)}>
                          <img src={icons.view} alt="View" className="action-icon" />
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() =>
                            setDeleteTarget({
                              id: session.monitoring_id || session.id,
                              title: getSessionTitle(session),
                            })
                          }
                        >
                          <img src={icons.delete} alt="Delete" className="action-icon" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {activePage === 'private' && (
          <>
            <div className="page-actions">
              <button className="btn-save" onClick={() => setPrivateModal(true)}>
                <img src={icons.add} alt="Add" className="action-icon" />
                Create Private Monitoring
              </button>
            </div>
            <div className="sessions-list">
              {loading ? (
                <div style={{ color: 'white' }}>Loading private sessions...</div>
              ) : privateSessions.length === 0 ? (
                <div style={{ color: 'white' }}>No private sessions found.</div>
              ) : (
                privateSessions.map((session) => (
                  <div
                    key={session.monitoring_id || session.id}
                    className="session-card private-card"
                  >
                    <div className="session-info">
                      <div className="session-title-row">
                        <h3>{getSessionTitle(session)}</h3>
                        <span className="session-badge private">
                          <img src={icons.privateSession} alt="Private" className="badge-icon" />
                          Private
                        </span>
                      </div>
                      <p>
                        DATE: {session.created_at || session.session_date} | TIME:{' '}
                        {session.start_time} - {session.end_time}
                      </p>
                      <p className="session-creator">
                        <img src={icons.profile} alt="Creator" className="meta-icon" />
                        Creator: {getSessionCreator(session)}
                      </p>
                    </div>
                    <div className="session-actions">
                      <button className="btn-view" onClick={() => setSelectedSession(session)}>
                        <img src={icons.view} alt="View" className="action-icon" />
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() =>
                          setDeleteTarget({
                            id: session.monitoring_id || session.id,
                            title: getSessionTitle(session),
                          })
                        }
                      >
                        <img src={icons.delete} alt="Delete" className="action-icon" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {(activePage === 'create' || activePage === 'create-monitoring') && (
          <div className="form-card">
            <h2>Create Monitoring</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Select Laboratory</label>
                <select
                  name="lab_id"
                  value={createForm.lab_id}
                  onChange={handleCreateChange}
                  required
                >
                  <option value="">--Lab--</option>
                  <option value="1">Lab 1</option>
                  <option value="2">Lab 2</option>
                  <option value="3">Lab 3</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Course</label>
                  <input name="course" value={createForm.course} onChange={handleCreateChange} required />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <select name="year_level" value={createForm.year_level} onChange={handleCreateChange} required>
                    <option value="">--Year--</option>
                    {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Section</label>
                  <select name="section" value={createForm.section} onChange={handleCreateChange} required>
                    <option value="">--Section--</option>
                    {['A', 'B', 'C', 'D', 'E'].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              <button type="button" className="btn-generate" onClick={loadMatchingStudents}>
                <img src={icons.users} alt="" className="action-icon" />
                Remove Students
              </button>

              {showStudentRemover && (
                <div className="student-remove-panel">
                  {matchingStudents.length === 0 ? (
                    <div>No students match this course, year, and section.</div>
                  ) : (
                    matchingStudents.map((student) => (
                      <label key={student.users_id}>
                        <input
                          type="checkbox"
                          checked={createForm.hiddenStudents.includes(student.users_id)}
                          onChange={() => toggleHiddenStudent(student.users_id)}
                        />
                        {student.last_name}, {student.first_name}
                      </label>
                    ))
                  )}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="session_date"
                    value={createForm.session_date}
                    onChange={handleCreateChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    name="start_time"
                    value={createForm.start_time}
                    onChange={handleCreateChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    name="end_time"
                    value={createForm.end_time}
                    onChange={handleCreateChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Total PC Slots</label>
                <input
                  type="number"
                  name="total_pcs_count"
                  value={createForm.total_pcs_count}
                  onChange={handleCreateChange}
                  min="1"
                />
                <button type="button" className="btn-generate" onClick={generatePCs}>
                  <img src={icons.pc} alt="PC" className="action-icon" />
                  Remove PC's
                </button>
              </div>

              {pcList.length > 0 && (
                <div className="form-group">
                  <label>Select/Remove PC</label>
                  <div className="pc-list">
                    {pcList.map((pc) => (
                      <div
                        key={pc}
                        className={`pc-item ${createForm.selectedPCs.includes(pc) ? 'selected' : ''}`}
                        onClick={() => togglePC(pc)}
                      >
                        PC {pc}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-save">
                  Save
                </button>
                <button type="button" className="btn-cancel" onClick={() => setActivePage('dashboard')}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {activePage === 'profile' && (
          <Profile userName={userName} userRole={userRole} userData={userData} onLogout={onLogout} onUserUpdate={onUserUpdate} />
        )}
      </div>

      <CreatePrivateSessionModal
        show={privateModal}
        onClose={() => setPrivateModal(false)}
        creatorId={userData?.users_id}
        onSuccess={handlePrivateSessionSuccess}
      />
      <InfoModal
        show={Boolean(selectedSession)}
        title="Session Details"
        rows={sessionRows}
        onClose={() => setSelectedSession(null)}
      />
      <ConfirmModal
        show={Boolean(deleteTarget)}
        title="Delete Monitoring"
        message={`Delete "${deleteTarget?.title || 'this session'}"? This action cannot be undone.`}
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
