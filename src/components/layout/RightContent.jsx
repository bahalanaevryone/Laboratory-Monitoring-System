import Dashboard from '../Pages/Dashboard';
import Lab1 from '../Pages/Lab1';
import Lab2 from '../Pages/Lab2';
import Lab3 from '../Pages/Lab3';
import User from '../Pages/User';
import CreateMonitoring from '../Pages/CreateMonitoring';
import SelfMonitoring from '../Pages/SelfMonitoring';
import AboutUs from '../Common/AboutUs';
import Profile from '../Common/Profile';
import './Navbar.css';

function RightContent({ activePage, userName, userRole }) {
  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'lab1':
        return <Lab1 />;
      case 'lab2':
        return <Lab2 />;
      case 'lab3':
        return <Lab3 />;
      case 'user':
        return <User />;
      case 'profile':
        return <Profile userName={userName} userRole={userRole} />;
      case 'create':
      case 'create-monitoring':
        return <CreateMonitoring />;
      case 'self-monitoring':
      case 'private':
        return <SelfMonitoring />;
      case 'about-us':
        return <AboutUs />;
      default:
        return <Dashboard />;
    }
  };

  return <div className="right-content">{renderContent()}</div>;
}

export default RightContent;
