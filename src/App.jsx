import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import MainPage from './components/MainPage';
import CustodianDashboard from './components/RoleDashboards/CustodianDashboard';
import InstructorDashboard from './components/RoleDashboards/InstructorDashboard';
import StudentDashboard from './components/RoleDashboards/StudentDashboard';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [userData, setUserData] = useState(null);

  const handleStart = () => setShowLanding(false);
  const handleCancel = () => setShowLanding(true);

  const handleLogin = (role, name, user) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setUserName(name);
    setUserData(user);
    setShowLanding(false);
    localStorage.setItem(
      'auth',
      JSON.stringify({ isLoggedIn: true, userRole: role, userName: name, userData: user })
    );
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setUserName('');
    setUserData(null);
    setShowLanding(true);
    localStorage.removeItem('auth');
  };

  const handleUserUpdate = (nextUser) => {
    const merged = { ...(userData || {}), ...(nextUser || {}) };
    const nextName = `${merged.first_name || ''} ${merged.last_name || ''}`.trim() || userName;
    setUserData(merged);
    setUserName(nextName);
    localStorage.setItem(
      'auth',
      JSON.stringify({ isLoggedIn: true, userRole, userName: nextName, userData: merged })
    );
  };

  useEffect(() => {
    const saved = localStorage.getItem('auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.isLoggedIn) {
          setShowLanding(false);
          setIsLoggedIn(true);
          setUserRole(parsed.userRole || null);
          setUserName(parsed.userName || '');
          setUserData(parsed.userData || null);
        }
      } catch (error) {
        console.warn('Failed to parse saved auth state', error);
        localStorage.removeItem('auth');
      }
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          showLanding ? (
            <LandingPage onStart={handleStart} />
          ) : !isLoggedIn ? (
            <MainPage onLogin={handleLogin} onCancel={handleCancel} />
          ) : (
            <Navigate to={`/${userRole}`} replace />
          )
        } />
        <Route path="/custodian" element={
          isLoggedIn && userRole === 'custodian' ? (
            <CustodianDashboard userName={userName} userRole={userRole} onLogout={handleLogout} userData={userData} onUserUpdate={handleUserUpdate} />
          ) : <Navigate to="/" replace />
        } />
        <Route path="/instructor" element={
          isLoggedIn && userRole === 'instructor' ? (
            <InstructorDashboard userName={userName} userRole={userRole} onLogout={handleLogout} userData={userData} onUserUpdate={handleUserUpdate} />
          ) : <Navigate to="/" replace />
        } />
        <Route path="/student" element={
          isLoggedIn && userRole === 'student' ? (
            <StudentDashboard userName={userName} userRole={userRole} onLogout={handleLogout} userData={userData} onUserUpdate={handleUserUpdate} />
          ) : <Navigate to="/" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;
