import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Basit ikon replacements
const Icons = {
  ArrowUp: () => <span>↑</span>,
  ArrowDown: () => <span>↓</span>,
  Envelope: () => <span>✉</span>,
  Clock: () => <span>🕐</span>,
  CheckCircle: () => <span>✓</span>,
  Ticket: () => <span>🎫</span>
};

// ChartJS'yi kaydet
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DashboardPage = () => {
  const { user } = useAuth();
  
  // State'ler - en başta tanımla
  const [stats, setStats] = useState({
    openTickets: 0,
    inProgressTickets: 0,
    closedTickets: 0,
    myTickets: 0
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketFilter, setTicketFilter] = useState('all'); // open, in_progress, closed, all, personal
  const [viewMode, setViewMode] = useState('department'); // department, personal, all_combined
  const [sortDesc, setSortDesc] = useState(true); // true: yeni > eski
  const [allDepartmentTickets, setAllDepartmentTickets] = useState([]);
  const [allPersonalTickets, setAllPersonalTickets] = useState([]);

  // Function to strip HTML tags and convert HTML entities
  const stripHtml = (html) => {
    if (!html) return '';
    
    // Basit bir regex ile HTML etiketlerini kaldır
    return html
      .replace(/<[^>]*>/g, '') // HTML etiketlerini kaldır
      .replace(/&lt;/g, '<')    // HTML entitilerini düzelt
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axiosInstance.get('tickets/');
        // Artık backend tek bir liste döndürüyor, is_personal ile ayrım yapacağız
        const allTickets = response.data || [];
        const departmentTickets = allTickets.filter(t => !t.is_personal);
        const personalTickets = allTickets.filter(t => t.is_personal);

        // Sıralama
        const sortedDepartment = departmentTickets.sort((a, b) => sortDesc
          ? new Date(b.created_at) - new Date(a.created_at)
          : new Date(a.created_at) - new Date(b.created_at)
        );
        const sortedPersonal = personalTickets.sort((a, b) => sortDesc
          ? new Date(b.created_at) - new Date(a.created_at)
          : new Date(a.created_at) - new Date(b.created_at)
        );

        // İstatistikleri hesapla
        const open = sortedDepartment.filter(t => t.status === 'open').length;
        const inProgress = sortedDepartment.filter(t => t.status === 'in_progress').length;
        const closed = sortedDepartment.filter(t => t.status === 'closed').length;

        setStats({
          openTickets: open,
          inProgressTickets: inProgress,
          closedTickets: closed,
          myTickets: sortedPersonal.length
        });
        setAllDepartmentTickets(sortedDepartment);
        setAllPersonalTickets(sortedPersonal);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user.id, sortDesc]);

  // Filtrelenmiş biletler (sadece departman için)
  const filteredDepartmentTickets = allDepartmentTickets.filter(ticket => {
    if (ticketFilter === 'all') return true;
    return ticket.status === ticketFilter;
  });

  // Filtrelenmiş kişisel biletler
  const filteredPersonalTickets = allPersonalTickets.filter(ticket => {
    if (ticketFilter === 'all') return true;
    return ticket.status === ticketFilter;
  });

  // Kombinli filtrelenmiş biletler
  const combinedFilteredTickets = [...filteredDepartmentTickets, ...filteredPersonalTickets].sort((a, b) =>
    sortDesc
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at)
  );

  // Gösterilecek biletleri seç
  const displayedTickets = viewMode === 'personal' ? filteredPersonalTickets : viewMode === 'all_combined' ? combinedFilteredTickets : filteredDepartmentTickets;

  // Gösterilecek başlığı seç
  const getDisplayTitle = () => {
    if (viewMode === 'personal') {
      return ticketFilter === 'all' ? 'Tüm Kişisel Taleplerim' : ticketFilter === 'open' ? 'Açık Kişisel Taleplerim' : ticketFilter === 'in_progress' ? 'İşlemdeki Kişisel Taleplerim' : 'Kapatılan Kişisel Taleplerim';
    }
    if (viewMode === 'all_combined') {
      return ticketFilter === 'all' ? 'Tüm Talepler' : ticketFilter === 'open' ? 'Açık Talepler' : ticketFilter === 'in_progress' ? 'İşlemdeki Talepler' : 'Kapatılan Talepler';
    }
    return ticketFilter === 'all' ? 'Birimdeki Tüm Talepler' : ticketFilter === 'open' ? 'Açık Talepler' : ticketFilter === 'in_progress' ? 'İşlemdeki Talepler' : 'Kapatılan Talepler';
  };

  // Bilet durumu için pasta grafik verileri
  const pieData = {
    labels: ['Açık', 'İşlemde', 'Kapalı'],
    datasets: [
      {
        data: [stats.openTickets, stats.inProgressTickets, stats.closedTickets],
        backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
        borderColor: ['#2563eb', '#d97706', '#059669'],
        borderWidth: 1,
      },
    ],
  };

  // Departman bazlı bilet dağılımı için bar grafik verileri
  // Not: Gerçek bir uygulamada bu veriler API'den gelmelidir
  const barData = {
    labels: ['BT', 'İK', 'Finans', 'Operasyon', 'Satış'],
    datasets: [
      {
        label: 'Bilet Sayısı',
        data: [12, 7, 3, 5, 8], // Örnek veri
        backgroundColor: '#3b82f6',
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setTicketFilter('all'); setViewMode('all_combined'); }}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <Icons.Ticket className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Tüm Talepler</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">{stats.openTickets + stats.inProgressTickets + stats.closedTickets + stats.myTickets}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setTicketFilter('open'); setViewMode('department'); }}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                <Icons.Envelope className="h-6 w-6 text-primary-600" />
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
        <div className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setTicketFilter('in_progress'); setViewMode('department'); }}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                <Icons.Clock className="h-6 w-6 text-orange-600" />
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
        <div className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setTicketFilter('closed'); setViewMode('department'); }}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <Icons.CheckCircle className="h-6 w-6 text-green-600" />
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
        <div className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setTicketFilter('all'); setViewMode('personal'); }}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <Icons.Ticket className="h-6 w-6 text-purple-600" />
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

      {/* Sıralama butonu ve filtrelenmiş talepler */}
      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="text-lg font-medium text-gray-900">
          {getDisplayTitle()}
        </h2>
        <button
          className="text-xs px-3 py-1 border rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => setSortDesc(v => !v)}
        >
          {sortDesc ? 'Yeniden Eskiye' : 'Eskiden Yeniye'}
        </button>
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="border-t border-gray-200 divide-y divide-gray-200">
          {displayedTickets.length > 0 ? (
            displayedTickets.map((ticket) => (
              <div key={ticket.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="text-sm font-medium text-primary-600 truncate hover:underline"
                  >
                    {ticket.title}
                  </Link>
                  <div className="ml-2 flex-shrink-0 flex items-center gap-2">
                    {/* Birim badge'i */}
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {ticket.department?.name || 'Bilinmeyen'}
                    </span>
                    {/* Kişiye özel badge'i */}
                    {ticket.is_personal ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Kişisel</span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-200">Departman</span>
                    )}
                    {/* Özel talep durumu badge'i */}
                    {ticket.is_private && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Gizli
                      </span>
                    )}
                    {/* Durum badge'i */}
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
                      <span className="truncate">
                        {ticket.description ? 
                          (ticket.description.length > 80 ? 
                            ticket.description.substring(0, 80) + '...' : 
                            ticket.description) : 
                          ''}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <span className="mr-1.5">
                      {ticket.priority === 'low' ? (
                        <Icons.ArrowDown className="h-4 w-4 text-green-500" />
                      ) : ticket.priority === 'high' || ticket.priority === 'critical' ? (
                        <Icons.ArrowUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <span className="h-4 w-4 rounded-full bg-yellow-200"></span>
                      )}
                    </span>
                    <span>{new Date(ticket.created_at).toLocaleString('tr-TR', { 
                      timeZone: 'Europe/Istanbul',
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-5 sm:px-6 text-center">
              <p className="text-gray-500">Henüz talep bulunmamaktadır.</p>
              <Link to="/tickets/new" className="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                Yeni Talep Oluştur
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Kişisel Talepler - Sadece viewMode department iken göster */}
      {viewMode === 'department' && (
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Kişisel Taleplerim</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-t border-gray-200 divide-y divide-gray-200">
            {allPersonalTickets.length > 0 ? (
              allPersonalTickets.map((ticket) => (
                <div key={ticket.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="text-sm font-medium text-primary-600 truncate hover:underline"
                    >
                      {ticket.title}
                    </Link>
                    <div className="ml-2 flex-shrink-0 flex items-center gap-2">
                      {/* Birim badge'i */}
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {ticket.department?.name || 'Bilinmeyen'}
                      </span>
                      {/* Kişiye özel badge'i */}
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Kişisel</span>
                      {/* Özel talep durumu badge'i */}
                      {ticket.is_private && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Gizli
                        </span>
                      )}
                      {/* Durum badge'i */}
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
                        <span className="truncate">
                          {ticket.description ? 
                            (ticket.description.length > 80 ? 
                              ticket.description.substring(0, 80) + '...' : 
                              ticket.description) : 
                            ''}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <span className="mr-1.5">
                        {ticket.priority === 'low' ? (
                          <Icons.ArrowDown className="h-4 w-4 text-green-500" />
                        ) : ticket.priority === 'high' || ticket.priority === 'critical' ? (
                          <Icons.ArrowUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <span className="h-4 w-4 rounded-full bg-yellow-200"></span>
                        )}
                      </span>
                      <span>{new Date(ticket.created_at).toLocaleString('tr-TR', { 
                        timeZone: 'Europe/Istanbul',
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-5 sm:px-6 text-center">
                <p className="text-gray-500">Kişisel talebiniz bulunmamaktadır.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default DashboardPage;
