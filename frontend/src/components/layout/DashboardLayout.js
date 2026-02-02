import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Transition } from '@headlessui/react';
import NotificationDropdown from '../ui/NotificationDropdown';

// Simple icons replacement
const Icons = {
  Bars3: () => <span>☰</span>,
  XMark: () => <span>×</span>,
  User: () => <span>👤</span>,
  Home: () => <span>🏠</span>,
  Ticket: () => <span>🎫</span>,
  UserGroup: () => <span>👥</span>,
  BuildingOffice: () => <span>🏢</span>,
  ArrowRightOnRectangle: () => <span>→</span>,
  Plus: () => <span>+</span>,
  Cog: () => <span>⚙</span>,
  BookOpen: () => <span>📖</span>,
  Clock: () => <span>🕐</span>,
  ChartPie: () => <span>📊</span>,
  Api: () => <span>🔌</span>
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', icon: Icons.Home, href: '/' },
    { name: 'Destek Talepleri', icon: Icons.Ticket, href: '/tickets' },
    { name: 'Yeni Talep', icon: Icons.Plus, href: '/tickets/new' },
    { name: 'Bilgi Bankası', icon: Icons.BookOpen, href: '/wikis' },
  ];

  // Admin için ek navigasyon öğeleri ekleyelim (Settings ekleyerek)
  const adminNavigation = [
    { name: 'Departmanlar', icon: Icons.BuildingOffice, href: '/departments' },
    { name: 'Kullanıcılar', icon: Icons.UserGroup, href: '/users' },
    { name: 'Raporlar ve Arama', icon: Icons.ChartPie, href: '/reports' },
    { name: 'Sistem Ayarları', icon: Icons.Cog, href: '/settings' },
    { name: 'Giriş Kayıtları', icon: Icons.Clock, href: '/login-logs' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <Transition show={sidebarOpen}>
          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0">
                <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
              </div>
            </Transition.Child>

            <Transition.Child
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  >
                    <span className="sr-only">Menüyü kapat</span>
                    <Icons.XMark className="h-6 w-6 text-white" />
                  </button>
                </div>
                <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                  <div className="flex-shrink-0 flex items-center px-4">
                    <div className="h-8 w-8 bg-primary-600 text-white flex items-center justify-center rounded-md">
                      DT
                    </div>
                    <span className="ml-2 text-lg font-medium text-gray-900">Destek Talep</span>
                  </div>
                  <nav className="mt-5 px-2 space-y-1">
                    {navigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          classNames(
                            isActive
                              ? 'bg-gray-100 text-primary-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                          )
                        }
                      >
                        <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                        {item.name}
                      </NavLink>
                    ))}

                    {user?.is_admin && (
                      <div className="mt-8">
                        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Yönetici Menüsü
                        </h3>
                        <div className="mt-1 space-y-1">
                          {adminNavigation.map((item) => (
                            <NavLink
                              key={item.name}
                              to={item.href}
                              className={({ isActive }) =>
                                classNames(
                                  isActive
                                    ? 'bg-gray-100 text-primary-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                  'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                                )
                              }
                            >
                              <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                              {item.name}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    )}
                  </nav>
                </div>
                <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                  <div className="flex-shrink-0 group block">
                    <div className="flex items-center">
                      <div>
                        <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                          {user?.full_name?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                          {user?.full_name}
                        </p>
                        <NavLink to="/profile" className="text-sm font-medium text-gray-500 group-hover:text-gray-700">
                          Profilim
                        </NavLink>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Transition>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="h-8 w-8 bg-primary-600 text-white flex items-center justify-center rounded-md">
                  DT
                </div>
                <span className="ml-2 text-lg font-medium text-gray-900">Destek Talep</span>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      classNames(
                        isActive
                          ? 'bg-gray-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                      )
                    }
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </NavLink>
                ))}

                {user?.is_admin && (
                  <div className="mt-8">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Yönetici Menüsü
                    </h3>
                    <div className="mt-1 space-y-1">
                      {adminNavigation.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          className={({ isActive }) =>
                            classNames(
                              isActive
                                ? 'bg-gray-100 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                              'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                            )
                          }
                        >
                          <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                          {item.name}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div>
                  <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="flex-shrink-0 flex">
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition ease-in-out duration-150"
                  >
                    <Icons.ArrowRightOnRectangle className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="lg:hidden px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:bg-gray-100 focus:text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Menüyü aç</span>
            <Icons.Bars3 className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">Destek Talep Sistemi</h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              <NotificationDropdown />
              <NavLink
                to="/profile"
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:shadow-outline focus:text-gray-500"
              >
                <span className="sr-only">Profil</span>
                <Icons.User className="h-6 w-6" />
              </NavLink>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Yardımcı fonksiyon: CSS sınıflarını birleştirme
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default DashboardLayout;
