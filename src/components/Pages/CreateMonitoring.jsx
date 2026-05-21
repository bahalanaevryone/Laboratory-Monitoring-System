import { useState } from 'react';
import { createMonitoring } from '../../services/api';
import Notification from '../Common/Notification';
import './CreateMonitoring.css';

function CreateMonitoring() {
  const [formData, setFormData] = useState({
    lab_id: '',
    session_date: '',
    start_time: '',
    end_time: '',
    total_pcs_count: 40,
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      const result = await createMonitoring(formData);
      if (!result.success) throw new Error(result.message || 'Failed to create monitoring session.');

      setFormData({
        lab_id: '',
        session_date: '',
        start_time: '',
        end_time: '',
        total_pcs_count: 40,
      });
      setNotice({ type: 'success', message: 'Monitoring session created successfully.' });
    } catch (error) {
      console.error('Create monitoring error:', error);
      setNotice({
        type: 'error',
        message: error.message || 'Error creating monitoring session. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-monitoring-container">
      <Notification
        message={notice?.message}
        type={notice?.type}
        onClose={() => setNotice(null)}
      />
      <div className="create-monitoring-header">
        <h1>Create Monitoring Session</h1>
        <p>Set up a new lab monitoring session</p>
      </div>

      <form className="create-monitoring-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="lab_id">Lab</label>
          <select
            id="lab_id"
            name="lab_id"
            value={formData.lab_id}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Lab</option>
            <option value="1">Lab 1</option>
            <option value="2">Lab 2</option>
            <option value="3">Lab 3</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="session_date">Session Date</label>
          <input
            type="date"
            id="session_date"
            name="session_date"
            value={formData.session_date}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="start_time">Start Time</label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              value={formData.start_time}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="end_time">End Time</label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              value={formData.end_time}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="total_pcs_count">Total PCs</label>
          <input
            type="number"
            id="total_pcs_count"
            name="total_pcs_count"
            value={formData.total_pcs_count}
            onChange={handleInputChange}
            min="1"
            max="100"
            required
          />
        </div>

        <button type="submit" className="btn-create" disabled={loading}>
          {loading ? 'Creating...' : 'Create Session'}
        </button>
      </form>
    </div>
  );
}

export default CreateMonitoring;
