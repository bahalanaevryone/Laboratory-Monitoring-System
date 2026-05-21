export default function AboutModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container about-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>About the System</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body about-body">
          <div className="about-lead">
            OMSC Computer Laboratory Monitoring System makes monitoring sessions faster, cleaner, and easier for both students and administrators.
          </div>

          <div className="about-grid">
            <section className="about-card">
              <h3>What It Does</h3>
              <p>Tracks lab usage in real time, records who uses each computer, and helps users quickly see available workstations.</p>
            </section>
            <section className="about-card">
              <h3>Why It Was Built</h3>
              <p>Manual logs can be slow and error-prone during busy periods. This system digitizes monitoring for better accuracy and faster updates.</p>
            </section>
          </div>

          <section className="about-card about-team">
            <h3>Laboratory Monitoring System Development Team</h3>
            <ul>
              <li>Joven Dela Cruz</li>
              <li>Carmela Delmundo</li>
              <li>Telfanie Mc</li>
              <li>Ranz Cedric Hernandez</li>
              <li>Paul Aguilar</li>
              <li>V John Sula</li>
              <li>Adreyy Custudiu</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
