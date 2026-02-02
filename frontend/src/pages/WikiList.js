import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useToast } from '../contexts/ToastContext';

const WikiList = () => {
  const [wikis, setWikis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWikis = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('wikis/');
        setWikis(response.data);
        
        // Departmanları da yükle
        const departmentsResponse = await axiosInstance.get('departments/');
        setDepartments(departmentsResponse.data);
      } catch (err) {
        console.error('Error fetching wikis:', err);
        setError('Bilgi bankası listesi yüklenirken bir hata oluştu.');
        addToast('Bilgi bankası listesi yüklenirken bir hata oluştu.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchWikis();
  }, [addToast]);

  // Filtreleme fonksiyonu
  const filteredWikis = wikis.filter(wiki => {
    const matchesSearch = wiki.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || wiki.department_id === parseInt(departmentFilter);
    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Bilgi Bankası</h1>
        <button
          onClick={() => navigate('/wikis/new')}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Yeni Wiki Oluştur
        </button>
      </div>

      <div className="bg-white shadow sm:rounded-lg p-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Ara
            </label>
            <input
              type="text"
              id="search"
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Wiki başlığında ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-1/2">
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Departman Filtresi
            </label>
            <select
              id="department"
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">Tüm Departmanlar</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredWikis.length === 0 ? (
          <div className="text-center py-10">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Kayıt bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">Wiki oluşturmak için "Yeni Wiki Oluştur" butonuna tıklayın.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >
                    Başlık
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Departman
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Oluşturan
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Güncelleme Tarihi
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredWikis.map((wiki) => {
                  // Departman bilgisini bul
                  const department = departments.find(d => d.id === wiki.department_id);
                  
                  return (
                    <tr key={wiki.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <Link
                          to={`/wikis/${wiki.id}`}
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          {wiki.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {department ? department.name : 'Departman Yok'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {wiki.creator_id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(wiki.updated_at || wiki.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {wiki.is_private ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Gizli
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Açık
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WikiList;