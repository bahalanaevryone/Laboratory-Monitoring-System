import { useMemo, useState } from 'react';
import { updateProfile } from '../../services/api';
import ConfirmModal from '../modal/ConfirmModal';
import Notification from './Notification';
import { icons } from '../icon';

function Profile({ userName, userRole, userData, onLogout, onUserUpdate }) {
  const isStudent = userRole === 'student';
  const [form, setForm] = useState({
    first_name: userData?.first_name || userName?.split(' ')[0] || '',
    last_name: userData?.last_name || userName?.split(' ').slice(1).join(' ') || '',
    course: userData?.course || '',
    year_level: userData?.year_level || '',
    section: userData?.section || '',
    password: '',
  });
  const [picture, setPicture] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const preview = useMemo(() => {
    if (picture) return URL.createObjectURL(picture);
    return userData?.profile_picture || '';
  }, [picture, userData?.profile_picture]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value ?? ''));
      if (picture) payload.append('profile_picture', picture);
      const result = await updateProfile(payload);
      if (!result.success) throw new Error(result.message || 'Profile update failed.');
      onUserUpdate?.(result.user);
      setNotice({ type: 'success', message: 'Profile updated successfully.' });
      setConfirmAction(null);
      setForm((current) => ({ ...current, password: '' }));
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container profile-page">
      <Notification message={notice?.message} type={notice?.type} onClose={() => setNotice(null)} />
      <h1 className="page-title">Profile Settings</h1>
      <div className="profile-card">
        <div className="profile-photo-panel">
          <div className="profile-photo">
            {preview ? <img src={preview} alt="Profile" /> : <img src={icons.profile} alt="Profile" />}
          </div>
          <label className="btn-secondary profile-upload">
            <img src={icons.image} alt="" className="action-icon" />
            Picture
            <input type="file" accept="image/*" onChange={(e) => setPicture(e.target.files?.[0] || null)} />
          </label>
          <div className="profile-role-pill">{userRole}</div>
        </div>

        <div className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input name="first_name" value={form.first_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input name="last_name" value={form.last_name} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={userData?.email || ''} disabled />
          </div>
          {isStudent && (
            <div className="form-row">
              <div className="form-group">
                <label>Course</label>
                <input name="course" value={form.course} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Year</label>
                <select name="year_level" value={form.year_level || ''} onChange={handleChange}>
                  <option value="">None</option>
                  {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Section</label>
                <select name="section" value={form.section || ''} onChange={handleChange}>
                  <option value="">None</option>
                  {['A', 'B', 'C', 'D', 'E'].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="form-group">
            <label>New Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Leave blank to keep current password" />
          </div>
          <div className="profile-actions">
            <button type="button" className="btn-save" onClick={() => setConfirmAction('save')}>Save Changes</button>
            <button type="button" className="btn-cancel" onClick={() => setConfirmAction('logout')}>Log Out</button>
          </div>
        </div>
      </div>

      <ConfirmModal
        show={confirmAction === 'save'}
        title="Save Profile"
        message="Do you want to save these profile changes?"
        confirmText="Save"
        loading={loading}
        onConfirm={saveProfile}
        onClose={() => !loading && setConfirmAction(null)}
      />
      <ConfirmModal
        show={confirmAction === 'logout'}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        danger
        onConfirm={onLogout}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}

export default Profile;
