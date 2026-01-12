import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const Departments = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentDeptId, setCurrentDeptId] = useState(null);
  
  // fetchDepartments fonksiyonunu tanımla
  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/departments/');
      setDepartments(response.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
      addToast('Departmanlar yüklenirken bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // useEffect'i düzelt
  useEffect(() => {
    // Kullanıcı admin değilse veri çekme
    if (!user?.is_admin) {
      setLoading(false);
      return;
    }
    
    fetchDepartments();
  }, [user, fetchDepartments]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        await axiosInstance.put(`/departments/${currentDeptId}`, formData);
        addToast('Departman başarıyla güncellendi.', 'success');
      } else {
        await axiosInstance.post('/departments/', formData);
        addToast('Departman başarıyla oluşturuldu.', 'success');
      }
      
      resetForm();
      fetchDepartments();
    } catch (err) {
      console.error('Error saving department:', err);
      addToast('Departman kaydedilirken bir hata oluştu.', 'error');
    }
  };
  
  const handleEdit = (dept) => {
    setFormData({
      name: dept.name,
      description: dept.description || ''
    });
    setIsEditing(true);
    setCurrentDeptId(dept.id);
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setIsEditing(false);
    setCurrentDeptId(null);
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('Bu departmanı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/departments/${id}`);
      addToast('Departman başarıyla silindi.', 'success');
      fetchDepartments();
    } catch (err) {
      console.error('Error deleting department:', err);
      addToast('Departman silinirken bir hata oluştu.', 'error');
    }
  };
  
  if (loading && departments.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Admin kontrolü burada yapılır (useEffect'ten sonra)
  if (!user?.is_admin) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-xl text-red-600 mb-4">Erişim Reddedildi</div>
        <p className="text-gray-600">
          Bu sayfaya erişmek için yönetici yetkilerine sahip olmanız gerekmektedir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Departman Yönetimi</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Departman Formu */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {isEditing ? 'Departmanı Düzenle' : 'Yeni Departman Ekle'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Departman Adı
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Açıklama
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    İptal
                  </button>
                )}
                
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {isEditing ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </div>
          </form>
        </div>
        
        {/* Departman Listesi */}
        <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Departmanlar</h2>
          
          {departments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Departman Adı
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Açıklama
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map(dept => (
                    <tr key={dept.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {dept.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {dept.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">Henüz departman bulunmamaktadır.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Departments;
