import { useState } from 'react';
import { createPrivateSession } from '../../services/api';
import './Modals.css';
import { icons } from '../icon';
import Notification from '../Common/Notification';

const initialForm = {
  lab_id: '',
  title: '',
  session_date: new Date().toISOString().split('T')[0],
  start_time: '',
  end_time: '',
  creator_pc: '',
  students: [{ firstname: '', lastname: '', pc: '' }],
};

export default function CreatePrivateSessionModal({ show, onClose, creatorId, onSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const closeModal = () => {
    setForm(initialForm);
    onClose();
  };

  const addStudent = () => {
    setForm({ ...form, students: [...form.students, { firstname: '', lastname: '', pc: '' }] });
  };

  const updateStudent = (idx, field, value) => {
    const updated = [...form.students];
    updated[idx][field] = value;
    setForm({ ...form, students: updated });
  };

  const removeStudent = (idx) => {
    setForm({ ...form, students: form.students.filter((_, index) => index !== idx) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.lab_id || !form.title || !form.start_time || !form.end_time || !form.creator_pc) {
      setNotice({ type: 'error', message: 'Please fill all required fields, including your PC number.' });
      return;
    }

    setSubmitting(true);

    const payload = {
      lab_id: form.lab_id,
      title: form.title,
      session_title: form.title,
      session_date: form.session_date,
      start_time: form.start_time,
      end_time: form.end_time,
      creator_id: creatorId,
      created_by: creatorId,
      created_by_id: creatorId,
      user_id: creatorId,
      users_id: creatorId,
      session_type: 'private',
      private_title: form.title,
      title: form.title,
      session_title: form.title,
      creator_pc: form.creator_pc,
      creator_pc_number: form.creator_pc,
      is_private: 1,
      private: 1,
      student_firstnames: form.students.map((student) => student.firstname),
      student_lastnames: form.students.map((student) => student.lastname),
      student_names: form.students.map((student) => `${student.firstname} ${student.lastname}`.trim()),
      participants: form.students.map((student) => `${student.firstname} ${student.lastname}`.trim()),
      student_pcs: form.students.map((student) => student.pc),
      participant_pcs: form.students.map((student) => student.pc),
    };

    try {
      const res = await createPrivateSession(payload);
      if (res.success) {
        setForm(initialForm);
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        setNotice({ type: 'error', message: res.message || 'Creation failed.' });
      }
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <Notification
        message={notice?.message}
        type={notice?.type}
        onClose={() => setNotice(null)}
      />
      <div className="modal-container private-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <img src={icons.privateSession} alt="Private" className="private-title-icon" />
            <h2>Private Monitoring</h2>
          </div>
          <button className="close-btn" onClick={closeModal}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Laboratory</label>
            <select
              value={form.lab_id}
              onChange={(e) => setForm({ ...form, lab_id: e.target.value })}
              required
            >
              <option value="">Select Lab</option>
              <option value="1">Lab 1</option>
              <option value="2">Lab 2</option>
              <option value="3">Lab 3</option>
            </select>
          </div>
          <div className="form-group">
            <label>Title/Your Name</label>
            <input
              type="text"
              placeholder='e.g. Juan Dela Cruz / For Thesis'
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Your PC Number</label>
            <input
              type="number"
              min="1"
              value={form.creator_pc}
              onChange={(e) => setForm({ ...form, creator_pc: e.target.value })}
              placeholder="Enter the PC number you will use"
              required
            />
          </div>
          <div className="form-group">
            <label>Other Participants (Optional)</label>
            {form.students.map((student, idx) => (
              <div key={idx} className="student-entry">
                <input
                  placeholder="First Name"
                  value={student.firstname}
                  onChange={(e) => updateStudent(idx, 'firstname', e.target.value)}
                />
                <input
                  placeholder="Last Name"
                  value={student.lastname}
                  onChange={(e) => updateStudent(idx, 'lastname', e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="PC #"
                  value={student.pc}
                  onChange={(e) => updateStudent(idx, 'pc', e.target.value)}
                />
                {form.students.length > 1 && (
                  <button
                    type="button"
                    className="remove-student-btn"
                    onClick={() => removeStudent(idx)}
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addStudent}>
              <img src={icons.add} alt="Add" className="badge-icon" />
              Add Person
            </button>
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? 'Creating...' : 'Save'}
            </button>
            <button type="button" className="btn-cancel" onClick={closeModal}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
