import { useState } from 'react';
import { icons } from './icon';
import './LandingPage.css';

const galleryImages = [
  '/img/pic1.jpg',
  '/img/pic2.jpg',
  '/img/pic3.jpg',
  '/img/pic4.jpg',
  '/img/pic5.jpg',
  '/img/pic6.jpg',
];

function LandingPage({ onStart }) {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="landing-page">
      <div className="landing-content">
        <img
          src="/img/462563031_1242485170222250_2903697580110087068_n-removebg-preview.png"
          alt="OMSC Logo"
          className="landing-logo"
        />
        <h1 className="brand-title">Laboratory Monitoring System</h1>
        <button className="start-btn" onClick={onStart}>
          <img src={icons.shuttle} alt="Start" className="start-icon" />
          <span>START</span>
        </button>
      </div>

      <section className="overview-section">
        <h2>Welcome to Laboratory Monitoring System</h2>
        <p>
          This platform helps students and staff track laboratory usage in real time,
          manage attendance, and keep every lab session organized.
        </p>
        <div className="overview-grid">
          <article className="overview-card">
            <img src={icons.dashboard} alt="Dashboard" />
            <h3>Real-Time Dashboard</h3>
            <p>See active sessions, available slots, and lab activity at a glance.</p>
          </article>
          <article className="overview-card">
            <img src={icons.lab} alt="Laboratory" />
            <h3>Lab 1, 2, and 3</h3>
            <p>Check each laboratory quickly with clear session and attendance details.</p>
          </article>
          <article className="overview-card">
            <img src={icons.privateSession} alt="Private Session" />
            <h3>Private Monitoring</h3>
            <p>Create and manage private monitoring sessions for focused lab work.</p>
          </article>
        </div>
      </section>

      <div className="gallery-section">
        <div className="gallery-header">
          <img
            src="/img/462563031_1242485170222250_2903697580110087068_n-removebg-preview.png"
            alt="OMSC Logo"
            className="gallery-logo"
          />
          <div>
            <h2>Laboratory Monitoring System</h2>
          </div>
        </div>
        <div className="gallery-grid">
          {galleryImages.map((image, index) => (
            <div className="gallery-card" key={image} onClick={() => setSelectedImage(image)}>
              <img src={image} alt={`Campus view ${index + 1}`} />
            </div>
          ))}
        </div>
      </div>

      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content">
            <img src={selectedImage} alt="Large view" />
            <button className="close-modal" onClick={() => setSelectedImage(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;

