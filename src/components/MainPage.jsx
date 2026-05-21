import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase';
import { googleAuth, login, register } from '../services/api';
import { icons } from './icon';
import Notification from './Common/Notification';
import './MainPage.css';

function MainPage({ onLogin, onCancel }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [instructorConfirmation, setInstructorConfirmation] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setFname('');
    setLname('');
    setCourse('');
    setYear('');
    setSection('');
    setConfirmPassword('');
    setInstructorConfirmation('');
    setRole('student');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice(null);

    try {
      if (isLogin) {
        const data = await login(email, password);
        if (data.success) {
          onLogin(data.role, `${data.first_name} ${data.last_name}`, data);
        } else {
          setError(data.message || 'Login failed');
        }
      } else {
        if (!role) {
          setError('Please choose a user type.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        if (role === 'instructor' && instructorConfirmation !== 'OMSC_Laboratory_Instructor_2026') {
          setError('Wrong OMSC Confirmation');
          return;
        }
        const data = await register({
          fname,
          lname,
          email,
          password,
          role,
          course,
          year,
          section,
          instructor_confirmation: instructorConfirmation,
        });
        if (data.success) {
          setNotice({ type: 'success', message: 'Registration successful. Please login.' });
          setIsLogin(true);
          resetForm();
        } else {
          setError(data.message || 'Registration failed');
        }
      }
    } catch (err) {
      setError(err.message || 'Network error. Make sure XAMPP is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    setNotice(null);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const [firstName = 'Google', ...lastNameParts] = (user.displayName || '').trim().split(' ');
      const lastName = lastNameParts.join(' ') || 'User';

      if (!isLogin) {
        setEmail(user.email || '');
        setFname(firstName);
        setLname(lastName);
        setNotice({ type: 'success', message: 'Google account details filled in.' });
        return;
      }

      const data = await googleAuth({
        email: user.email || '',
        uid: user.uid,
        fname: firstName,
        lname: lastName,
        display_name: user.displayName || `${firstName} ${lastName}`,
        photo_url: user.photoURL || '',
      });

      if (data.success) {
        onLogin(data.role, `${data.first_name} ${data.last_name}`, data);
      } else {
        setError(data.message || 'Google login failed.');
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setNotice({ type: 'info', message: 'Google sign-in was cancelled.' });
      } else {
        setError('Google login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-page">
      <Notification
        message={notice?.message}
        type={notice?.type}
        onClose={() => setNotice(null)}
      />
      <div className="login-container">
        <img
          src="/img/462563031_1242485170222250_2903697580110087068_n-removebg-preview.png"
          alt="OMSC Logo"
          className="auth-logo"
        />
        <h3>{isLogin ? 'Login' : 'Create Account'}</h3>
        {!isLogin && (
          <div className="user-type-picker" aria-label="Choose user type">
            {['student', 'instructor'].map((type) => (
              <button
                type="button"
                key={type}
                className={`user-type-btn ${role === type ? 'active' : ''}`}
                onClick={() => setRole(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <>
              <div className="input-group">
                <img src={icons.mail} alt="Email" className="input-icon" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <img src={icons.user} alt="First Name" className="input-icon" />
                <input
                  type="text"
                  placeholder="First Name"
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <img src={icons.user} alt="Last Name" className="input-icon" />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lname}
                  onChange={(e) => setLname(e.target.value)}
                  required
                />
              </div>
              {role === 'student' && (
                <>
                  <div className="input-group">
                    <img src={icons.idCard} alt="Course" className="input-icon" />
                    <input
                      type="text"
                      placeholder="Course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row compact-auth-row">
                    <div className="input-group">
                      <img src={icons.calendar} alt="Year" className="input-icon" />
                      <select value={year} onChange={(e) => setYear(e.target.value)} required>
                        <option value="">Year</option>
                        {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <img src={icons.role} alt="Section" className="input-icon" />
                      <select value={section} onChange={(e) => setSection(e.target.value)} required>
                        <option value="">Section</option>
                        {['A', 'B', 'C', 'D', 'E'].map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {isLogin && (
            <div className="input-group">
              <img src={icons.mail} alt="Email" className="input-icon" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          <div className="input-group">
            <img src={icons.padlock} alt="Password" className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              <img
                src={showPassword ? icons.hide : icons.show}
                alt={showPassword ? 'Hide' : 'Show'}
              />
            </button>
          </div>
          {!isLogin && (
            <>
              <div className="input-group">
                <img src={icons.padlock} alt="Confirm Password" className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {role === 'instructor' && (
                <div className="input-group">
                  <img src={icons.unlock} alt="OMSC Confirmation" className="input-icon" />
                  <input
                    type="text"
                    placeholder="OMSC Confirmation"
                    value={instructorConfirmation}
                    onChange={(e) => setInstructorConfirmation(e.target.value)}
                    required
                  />
                </div>
              )}
            </>
          )}
          {error && <div className="error-message">{error}</div>}
          <button
            type="button"
            className="google-auth-btn"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            <img src={icons.google} alt="" className="google-auth-icon" />
            <span>Continue with Google</span>
          </button>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (isLogin ? 'Logging in...' : 'Registering...') : isLogin ? 'Login' : 'Register'}
            </button>
            <button type="button" className="cancel-btn" onClick={() => {
              resetForm();
              if (typeof onCancel === 'function') onCancel();
            }} disabled={loading}>
              Cancel
            </button>
          </div>
          <button
            type="button"
            className="toggle-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              resetForm();
            }}
          >
            {isLogin ? 'Create Account?' : 'Already have account? Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MainPage;
