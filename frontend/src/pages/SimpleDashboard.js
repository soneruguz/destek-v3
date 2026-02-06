import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const SimpleDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    openTickets: 0,
    inProgressTickets: 0,
    closedTickets: 0,
    myTickets: 0
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Gerçek uygulamada, bir dashboard API endpoint'i olacaktır
        const response = await axiosInstance.get('tickets/');
        const tickets = response.data;

        // İstatistikleri hesapla
        const open = tickets.filter(t => t.status === 'open').length;
        const inProgress = tickets.filter(t => t.status === 'in_progress').length;
        const closed = tickets.filter(t => t.status === 'closed').length;

        // Son biletler (son 5 adet)
        const recent = tickets
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);

        setStats({
          openTickets: open,
          inProgressTickets: inProgress,
          closedTickets: closed,
          myTickets: tickets.filter(t => t.creator_id === user.id).length
        });
        setRecentTickets(recent);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Destek Paneli v1.0</h1>
      <p className="text-sm text-gray-500">Destek taleplerinizi yönetin</p>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Açık Talepler</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">{stats.openTickets}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">İşlemdeki Talepler</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">{stats.inProgressTickets}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Kapatılan Talepler</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">{stats.closedTickets}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Taleplerim</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">{stats.myTickets}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Son Talepler */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Son Talepler</h2>
            <p className="mt-1 text-sm text-gray-500">Son eklenen 5 destek talebi</p>
          </div>
          <Link to="/tickets" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Tüm Talepleri Gör
          </Link>
        </div>
        <div className="border-t border-gray-200 divide-y divide-gray-200">
          {recentTickets.length > 0 ? (
            recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`px-4 py-4 sm:px-6 ${ticket.status === 'closed' ? 'bg-slate-50 hover:bg-slate-100' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="text-sm font-medium text-primary-600 truncate hover:underline"
                  >
                    {ticket.title}
                  </Link>
                  <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                    {/* Birim (Department) Badge */}
                    {ticket.department && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {ticket.department.name || 'Bilinmeyen'}
                      </span>
                    )}
                    
                    {/* Kişiye Özel Badge */}
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ticket.is_personal 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {ticket.is_personal ? 'Kişisel' : 'Birim'}
                    </span>
                    
                    {/* Özel Talep Durumu Badge */}
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ticket.is_private 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {ticket.is_private ? 'Özel' : 'Genel'}
                    </span>
                    
                    {/* Status Badge */}
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.status === 'open'
                          ? 'bg-blue-100 text-blue-800'
                          : ticket.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {ticket.status === 'open' ? 'Açık' : ticket.status === 'in_progress' ? 'İşlemde' : 'Kapalı'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="truncate">{ticket.description.length > 80 ? ticket.description.substring(0, 80) + '...' : ticket.description}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <span>{new Date(ticket.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-5 sm:px-6 text-center">
              <p className="text-gray-500">Henüz talep bulunmamaktadır.</p>
              <Link to="/tickets/new" className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                Yeni Talep Oluştur
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;
