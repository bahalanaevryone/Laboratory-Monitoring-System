import { useState, useEffect } from 'react';
import { getAvailablePCs, checkin } from '../../services/api';
import Notification from '../Common/Notification';
import './Modals.css';

export default function CheckinModal({ show, monitoringId, studentId, onClose, onCheckinSuccess }) {
  const [pcs, setPcs] = useState([]);
  const [available, setAvailable] = useState([]);
  const [selectedPc, setSelectedPc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (show && monitoringId) {
      setLoading(true);
      getAvailablePCs(monitoringId).then(data => {
        setPcs(data.all_pcs || []);
        setAvailable(data.pcs || []);
      }).finally(() => setLoading(false));
    }
  }, [show, monitoringId]);

  const handleCheckin = async () => {
    if (!selectedPc) {
      setNotice({ type: 'error', message: 'Please select a PC.' });
      return;
    }
    setChecking(true);
    try {
      const result = await checkin(monitoringId, selectedPc, studentId);
      if (result.success) {
        setNotice({ type: 'success', message: 'Checked in successfully.' });
        onCheckinSuccess();
        onClose();
      } else {
        setNotice({ type: 'error', message: result.message || 'Check-in failed.' });
      }
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Check-in failed.' });
    } finally {
      setChecking(false);
    }
  };

  if (!show) return null;
  const isAvailable = (pc) => available.some(a => a.pc_id === pc.pc_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Notification
        message={notice?.message}
        type={notice?.type}
        onClose={() => setNotice(null)}
      />
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Select one PC Number</h2><button className="close-btn" onClick={onClose}>&times;</button></div>
        <div className="modal-body">
          {loading ? <div>Loading PCs...</div> : (
            <>
              <div className="pc-grid">
                {pcs.map(pc => (
                  <button key={pc.pc_id} className={`pc-btn ${isAvailable(pc) ? 'available' : 'inuse'} ${selectedPc === pc.pc_id ? 'selected' : ''}`} disabled={!isAvailable(pc)} onClick={() => setSelectedPc(pc.pc_id)}>
                    {pc.pc_number}
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                <button className="btn-save" onClick={handleCheckin} disabled={checking}>{checking ? 'Checking...' : 'Save'}</button>
                <button className="btn-cancel" onClick={onClose}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
