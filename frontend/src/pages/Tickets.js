import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    priority: '',
    department: '',
    search: ''
  });
  const [error, setError] = useState(null);
  const { user, token, isAuthenticated } = useAuth(); // AuthContext'ten kullanıcı bilgisini al

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) {
        return; // Kullanıcı bilgisi yoksa bekle
      }

      setLoading(true);
      try {
        const response = await axiosInstance.get('tickets/');
        setTickets(response.data);

        // Atanan talepleri özel olarak vurgulayabilirsiniz
        const assignedTickets = response.data.filter(ticket => ticket.assignee_id === user.id);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError('Talepler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user, isAuthenticated, token]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    if (filter.status && ticket.status !== filter.status) return false;
    if (filter.priority && ticket.priority !== filter.priority) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const titleMatch = ticket.title.toLowerCase().includes(searchLower);
      const idMatch = ticket.id.toString().includes(searchLower);
      if (!titleMatch && !idMatch) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Destek Talepleri</h1>
        <Link
          to="/tickets/new"
          className="btn btn-primary"
        >
          Yeni Talep
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Filtreler</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Durum</label>
              <select
                id="status"
                name="status"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={filter.status}
                onChange={handleFilterChange}
              >
                <option value="">Tümü</option>
                <option value="open">Açık</option>
                <option value="in_progress">İşlemde</option>
                <option value="closed">Kapalı</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Öncelik</label>
              <select
                id="priority"
                name="priority"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={filter.priority}
                onChange={handleFilterChange}
              >
                <option value="">Tümü</option>
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="critical">Kritik</option>
              </select>
            </div>

            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">Arama</label>
              <input
                type="text"
                id="search"
                name="search"
                placeholder="Başlık veya ID ile ara..."
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={filter.search}
                onChange={handleFilterChange}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredTickets.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Başlık
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Birim
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öncelik
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kişiye Özel
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Özel Talep Durumu
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturulma
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">İşlemler</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={ticket.status === 'closed' ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{ticket.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {ticket.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {ticket.department?.name || 'Bilinmeyen'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                        }`}>
                        {ticket.status === 'open' ? 'Açık' :
                          ticket.status === 'in_progress' ? 'İşlemde' : 'Kapalı'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' :
                          ticket.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            ticket.priority === 'high' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                        }`}>
                        {ticket.priority === 'low' ? 'Düşük' :
                          ticket.priority === 'medium' ? 'Orta' :
                            ticket.priority === 'high' ? 'Yüksek' : 'Kritik'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.is_personal ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Kişisel
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          Departman
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.is_private ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Gizli
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Açık
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ticket.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/tickets/${ticket.id}`} className="text-primary-600 hover:text-primary-900">
                        Görüntüle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">Gösterilecek destek talebi bulunamadı.</p>
              <Link to="/tickets/new" className="mt-4 inline-block btn btn-primary">
                Yeni Talep Oluştur
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tickets;
