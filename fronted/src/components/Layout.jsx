import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = () => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__content">
        <main className="layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
