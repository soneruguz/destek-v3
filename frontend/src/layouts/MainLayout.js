import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/MainLayout.css';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="main-layout">
      <header className="header">
        <div className="header-left">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <span className="menu-icon">☰</span>
          </button>
          <h1 className="site-title">Destek Talep Sistemi</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="welcome">Merhaba, {user?.full_name}</span>
            <button className="logout-btn" onClick={handleLogout}>Çıkış</button>
          </div>
        </div>
      </header>

      <div className="content-container">
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <nav className="main-nav">
            <ul>
              <li>
                <NavLink to="/" end>
                  <i className="icon">📊</i> Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/tickets">
                  <i className="icon">🎫</i> Destek Talepleri
                </NavLink>
              </li>
              <li>
                <NavLink to="/tickets/new">
                  <i className="icon">➕</i> Yeni Talep
                </NavLink>
              </li>
              <li>
                <NavLink to="/wikis">
                  <i className="icon">📚</i> Bilgi Bankası
                </NavLink>
              </li>
              {user?.is_admin && (
                <>
                  <li>
                    <NavLink to="/departments">
                      <i className="icon">🏢</i> Departmanlar
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/users">
                      <i className="icon">👥</i> Kullanıcılar
                    </NavLink>
                  </li>
                </>
              )}
              <li>
                <NavLink to="/profile">
                  <i className="icon">👤</i> Profil
                </NavLink>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
