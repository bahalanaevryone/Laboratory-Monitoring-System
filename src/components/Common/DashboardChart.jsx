import React from 'react';
import './DashboardChart.css';

function DashboardChart({ data, type = 'bar', title }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (type === 'donut') {
    let cumulativePercent = 0;
    const segments = data.map((item) => {
      const percent = total > 0 ? (item.value / total) * 100 : 0;
      const startPercent = cumulativePercent;
      cumulativePercent += percent;
      return {
        ...item,
        percent,
        startPercent,
        endPercent: cumulativePercent,
      };
    });

    const radius = 66;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="chart-container donut-chart">
        {title && <h4 className="chart-title">{title}</h4>}
        <div className="donut-wrapper">
          <svg viewBox="0 0 200 200" className="donut-svg">
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="rgba(148, 163, 184, 0.24)"
              strokeWidth="28"
            />
            {segments.map((segment, index) => {
              const offset = circumference - (segment.percent / 100) * circumference;
              const rotation = (segment.startPercent / 100) * 360 - 90;
              return (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="28"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={offset}
                  transform={`rotate(${rotation} 100 100)`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              );
            })}
            <text x="100" y="95" textAnchor="middle" className="donut-total-label">
              Sessions
            </text>
            <text x="100" y="118" textAnchor="middle" className="donut-total-value">
              {total}
            </text>
          </svg>
        </div>
        <div className="chart-legend">
          {segments.map((item, index) => (
            <div key={index} className="legend-item">
              <span className="legend-dot" style={{ background: item.color }} />
              <span className="legend-label">{item.label}</span>
              <span className="legend-value">{item.value}</span>
              <span className="legend-percent">({item.percent.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Bar chart (default)
  return (
    <div className="chart-container bar-chart">
      {title && <h4 className="chart-title">{title}</h4>}
      <div className="bars-wrapper">
        {data.map((item, index) => {
          const heightPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const percentOfTotal = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={index} className="bar-item">
              <div className="bar-value-top">{item.value}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    height: `${heightPercent}%`,
                    background: item.color,
                  }}
                >
                  <div className="bar-glow" style={{ background: item.color }} />
                </div>
              </div>
              <div className="bar-info">
                <span className="bar-label">{item.label}</span>
                <span className="bar-percent">{percentOfTotal}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardChart;

