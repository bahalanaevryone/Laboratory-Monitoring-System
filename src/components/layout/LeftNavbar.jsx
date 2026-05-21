import { useState } from 'react';
import './Navbar.css';
import { icons } from '../icon';

const iconMap = {
  dashboard: icons.dashboard,
  lab1: icons.lab,
  lab2: icons.lab,
  lab3: icons.lab,
  create: icons.create,
  private: icons.privateSession,
  user: icons.users,
  about: icons.about,
  logout: icons.logout,
};

function LeftNavbar({ buttons, activeButton, onButtonClick, userName, userRole, onCreateRegular, onCreatePrivate, onProfileClick, profilePicture }) {
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const isInstructor = userRole === 'instructor';
  const isStudent = userRole === 'student';

  const handleNavClick = (id) => {
    if (id === 'create') {
      if (isInstructor) {
        setShowCreateMenu(!showCreateMenu);
      } else if (isStudent && onCreatePrivate) {
        onCreatePrivate();
      } else {
        onButtonClick(id);
      }
    } else {
      onButtonClick(id);
    }
  };

  const handleCreateOption = (type) => {
    setShowCreateMenu(false);
    if (type === 'regular' && onCreateRegular) {
      onCreateRegular();
    } else if (type === 'private' && onCreatePrivate) {
      onCreatePrivate();
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="left-navbar desktop-nav">
        <div className="nav-header">
          <div className="nav-brand">
            <img src="/img/462563031_1242485170222250_2903697580110087068_n-removebg-preview.png" alt="OMSC" className="nav-brand-logo" />
            <div>
              <h3>OMSC LabMonitor</h3>
              <p className="role-badge">
                <img src={icons.role} alt="Role" className="role-icon" />
                {userRole || 'User'}
              </p>
            </div>
          </div>
        </div>

        <div className="nav-buttons">
          {buttons.map((button) => (
            <button
              key={button.id}
              className={`nav-btn ${activeButton === button.id ? 'active' : ''}`}
              onClick={() => handleNavClick(button.id)}
            >
              <span className="nav-icon">
                <img src={iconMap[button.id] || icons.dashboard} alt={button.label} />
              </span>
              <span className="nav-label">{button.label}</span>
            </button>
          ))}
        </div>

        <div className="nav-footer">
          <div className="profile-info">
            <button
              type="button"
              className={`profile-avatar ${profilePicture ? 'has-photo' : ''}`}
              onClick={onProfileClick}
              aria-label="Open profile settings"
            >
              <img src={profilePicture || icons.profile} alt="Profile" />
            </button>
            <button type="button" className="profile-details profile-details-button" onClick={onProfileClick}>
              <div className="profile-name">{userName}</div>
              <div className="profile-role">{userRole}</div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="mobile-bottom-nav">
        <div className="mobile-nav-buttons">
          {buttons
            .filter(button => button.id !== 'private' && button.id !== 'about')
            .sort((a, b) => {
              const order = ['dashboard', 'lab1', 'lab2', 'lab3', 'user', 'report', 'create'];
              return order.indexOf(a.id) - order.indexOf(b.id);
            })
            .map((button) => {
            const isCreateBtn = button.id === 'create';

            return (
              <button
                key={button.id}
                className={`mobile-nav-btn ${isCreateBtn ? 'fab-btn' : ''} ${activeButton === button.id ? 'active' : ''}`}
                onClick={() => handleNavClick(button.id)}
              >
                {isCreateBtn ? (
                  <>
                    <span className="mobile-fab-icon">
                      <img src={iconMap[button.id] || icons.dashboard} alt={button.label} />
                    </span>
                    <span className="mobile-nav-label">{button.label}</span>
                  </>
                ) : (
                  <>
                    <span className="mobile-nav-icon">
                      <img src={iconMap[button.id] || icons.dashboard} alt={button.label} />
                    </span>
                    <span className="mobile-nav-label">{button.label}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Create Menu */}
      {showCreateMenu && isInstructor && (
        <div className="create-menu-overlay" onClick={() => setShowCreateMenu(false)}>
          <div className="create-menu" onClick={(e) => e.stopPropagation()}>
            <button className="create-menu-item" onClick={() => handleCreateOption('regular')}>
              <span className="create-menu-icon regular">
                <img src={icons.regularSession} alt="Regular" />
              </span>
              <span>Regular Monitoring</span>
            </button>
            <button className="create-menu-item" onClick={() => handleCreateOption('private')}>
              <span className="create-menu-icon private">
                <img src={icons.add} alt="Private" />
              </span>
              <span>Private Monitoring</span>
            </button>
            <button className="create-menu-cancel" onClick={() => setShowCreateMenu(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="mobile-top-header">
        <div className="mobile-brand">
          <img src="/img/462563031_1242485170222250_2903697580110087068_n-removebg-preview.png" alt="OMSC" className="mobile-brand-logo" />
          <div>
            <h3>OMSC LabMonitor</h3>
            <p className="mobile-role">
              <img src={icons.role} alt="Role" className="mobile-role-icon" />
              {userRole || 'User'}
            </p>
          </div>
        </div>
        <div className="mobile-actions">
          <button
            type="button"
            className={`mobile-profile ${profilePicture ? 'has-photo' : ''}`}
            onClick={onProfileClick}
            aria-label="Open profile settings"
          >
            <img src={profilePicture || icons.profile} alt="Profile" />
          </button>
          <button className="mobile-about" onClick={() => onButtonClick('about')}>
            <img src={icons.about} alt="About" />
          </button>
        </div>
      </div>
    </>
  );
}

export default LeftNavbar;
