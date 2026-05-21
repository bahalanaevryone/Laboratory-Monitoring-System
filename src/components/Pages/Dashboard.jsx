import { useEffect, useState } from 'react';
import { getStudentMonitoring } from '../../services/api';
import './Dashboard.css';

function Dashboard({ userData }) {
  const [stats, setStats] = useState({
    total: 0,
    regular: 0,
    private: 0,
    lab1: 0,
    lab2: 0,
    lab3: 0,
  });

  const isPrivateSession = (session) => {
    const type = String(
      session.session_type || session.session_title || session.title || ''
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStudentMonitoring('all');
        const sessions = data || [];

        // Count ALL private sessions (not just upcoming ones)
        const privateCount = sessions.filter(isPrivateSession).length;
        const regularCount = sessions.length - privateCount;
        const lab1Count = sessions.filter((s) => s.lab_id == 1).length;
        const lab2Count = sessions.filter((s) => s.lab_id == 2).length;
        const lab3Count = sessions.filter((s) => s.lab_id == 3).length;

        setStats({
          total: sessions.length,
          regular: regularCount,
          private: privateCount,
          lab1: lab1Count,
          lab2: lab2Count,
          lab3: lab3Count,
        });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
        setStats({
          total: 0,
          regular: 0,
          private: 0,
          lab1: 0,
          lab2: 0,
          lab3: 0,
        });
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="dashboard-wrapper">
      <div className="stats-grid">
        {[
          { label: 'Total Available Monitoring', value: stats.total },
          { label: 'Regular Monitoring', value: stats.regular },
          { label: 'Private Monitoring', value: stats.private },
          { label: 'Lab 1 Available Monitoring', value: stats.lab1 },
          { label: 'Lab 2 Available Monitoring', value: stats.lab2 },
          { label: 'Lab 3 Available Monitoring', value: stats.lab3 },
        ].map((stat) => (
          <div key={stat.label} className="small-stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>
      <div className="dashboard-graph">
        {[
          { label: 'Regular', value: stats.regular, color: '#0f766e' },
          { label: 'Private', value: stats.private, color: '#7c3aed' },
          { label: 'Lab 1', value: stats.lab1, color: '#2a2f9b' },
          { label: 'Lab 2', value: stats.lab2, color: '#ea580c' },
          { label: 'Lab 3', value: stats.lab3, color: '#c026d3' },
        ].map((item) => (
          <div key={item.label} className="graph-card">
            <div className="graph-label">{item.label}</div>
            <div className="graph-bar">
              <div
                className="graph-bar-fill"
                style={{ height: `${Math.min(item.value * 10, 100)}%`, background: item.color }}
              />
            </div>
            <div className="graph-bar-title">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;

