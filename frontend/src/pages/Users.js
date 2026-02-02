import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import { API_ROUTES } from '../config/apiConfig';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const Users = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingLdap, setSyncingLdap] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    is_admin: false,
    is_ldap: false,
    is_active: true,
    department_ids: []
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // useEffect'i koşullu ifadeden önce çağır
  useEffect(() => {
    // Kullanıcı admin değilse veri çekme
    if (!user?.is_admin) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersRes, deptsRes] = await Promise.all([
          axiosInstance.get(API_ROUTES.USERS),
          axiosInstance.get(API_ROUTES.DEPARTMENTS)
        ]);
        
        setUsers(usersRes.data);
        setDepartments(deptsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        addToast('Veriler yüklenirken bir hata oluştu.', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, addToast]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleDepartmentChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value));
    setFormData(prev => ({ ...prev, department_ids: selectedOptions }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Şifre kontrolü
    if (!isEditing && !formData.password) {
      addToast('Lütfen bir şifre belirleyin.', 'error');
      return;
    }
    
    // LDAP kullanıcıları için şifre gerekmez
    if (formData.is_ldap) {
      setFormData(prev => ({ ...prev, password: '' }));
    }
    
    try {
      if (isEditing) {
        // Boş şifre ise, şifre alanını istek gövdesinden çıkar
        const userData = { ...formData };
        if (!userData.password) {
          delete userData.password;
        }
        
        await axiosInstance.put(API_ROUTES.USER(currentUserId), userData);
        addToast('Kullanıcı başarıyla güncellendi.', 'success');
      } else {
        await axiosInstance.post(API_ROUTES.USERS, formData);
        addToast('Kullanıcı başarıyla oluşturuldu.', 'success');
      }
      
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      addToast('Kullanıcı kaydedilirken bir hata oluştu.', 'error');
    }
  };
  
  const handleEdit = async (selectedUser) => {
    try {
      // Kullanıcının tam bilgilerini getir
      const userResponse = await axiosInstance.get(API_ROUTES.USER(selectedUser.id));
      const fullUserData = userResponse.data;
      
      // Kullanıcının departmanlarını getir
      const userDeptResponse = await axiosInstance.get(API_ROUTES.USER_DEPARTMENTS(selectedUser.id));
      const userDeptIds = userDeptResponse.data.map(dept => dept.id);
      
      setFormData({
        username: fullUserData.username || '',
        email: fullUserData.email || '',
        full_name: fullUserData.full_name || '',
        password: '', // Şifre alanını boş bırak
        is_admin: fullUserData.is_admin || false,
        is_ldap: fullUserData.is_ldap || false,
        is_active: fullUserData.is_active !== undefined ? fullUserData.is_active : true,
        department_ids: userDeptIds || []
      });
      
      setIsEditing(true);
      setCurrentUserId(selectedUser.id);
    } catch (err) {
      // 403 hatası normaldir - sadece admin kullanıcı departmanlarını görebilir
      // Sessizce devam et
    }
  };
  
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      is_admin: false,
      is_ldap: false,
      is_active: true,
      department_ids: []
    });
    setIsEditing(false);
    setCurrentUserId(null);
  };
  
  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get(API_ROUTES.USERS);
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      addToast('Kullanıcılar yüklenirken bir hata oluştu.', 'error');
    }
  };
  
  const handleDelete = async (id) => {
    // Kendini silmeyi önle
    if (id === user.id) {
      addToast('Kendi hesabınızı silemezsiniz.', 'error');
      return;
    }
    
    if (!window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await axiosInstance.delete(API_ROUTES.USER(id));
      addToast('Kullanıcı başarıyla silindi.', 'success');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      addToast('Kullanıcı silinirken bir hata oluştu.', 'error');
    }
  };
  
  const handleSyncLdap = async () => {
    setSyncingLdap(true);
    try {
      const response = await axiosInstance.post('users/sync-ldap/');
      if (response.data.success) {
        addToast(`${response.data.synced_count} kullanıcı senkronize edildi`, 'success');
        fetchUsers(); // Kullanıcı listesini yenile
      } else {
        addToast(response.data.message || 'LDAP senkronizasyon hatası', 'error');
      }
    } catch (error) {
      console.error('LDAP sync error:', error);
      addToast('LDAP senkronizasyonu sırasında hata oluştu', 'error');
    } finally {
      setSyncingLdap(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Admin kontrolü (useEffect'ten sonra)
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Kullanıcılar</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleSyncLdap}
            disabled={syncingLdap}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {syncingLdap ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Senkronize Ediliyor...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                LDAP'tan Kullanıcıları Çek
              </>
            )}
          </button>
          <button
            onClick={resetForm}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Yeni Kullanıcı
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kullanıcı Formu */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {isEditing ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-posta
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Tam Ad
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Şifre {isEditing && '(değiştirmek için doldurun)'}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required={!isEditing && !formData.is_ldap}
                  disabled={formData.is_ldap}
                />
              </div>
              
              <div>
                <label htmlFor="department_ids" className="block text-sm font-medium text-gray-700">
                  Departmanlar
                </label>
                <select
                  id="department_ids"
                  name="department_ids"
                  multiple
                  value={formData.department_ids}
                  onChange={handleDepartmentChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Birden fazla seçim için Ctrl/Cmd tuşunu basılı tutun</p>
              </div>
              
              <div className="flex items-center">
                <input
                  id="is_admin"
                  name="is_admin"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={formData.is_admin}
                  onChange={handleChange}
                />
                <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-900">
                  Yönetici yetkilerine sahip
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="is_ldap"
                  name="is_ldap"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={formData.is_ldap}
                  onChange={handleChange}
                />
                <label htmlFor="is_ldap" className="ml-2 block text-sm text-gray-900">
                  LDAP/AD kullanıcısı
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Kullanıcı aktif (pasif kullanıcılar giriş yapamaz)
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
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
        
        {/* Kullanıcı Listesi */}
        <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Kullanıcılar</h2>
          
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcı Adı
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tam Ad
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(usr => (
                    <tr key={usr.id} className={!usr.is_active ? 'bg-gray-100 opacity-60' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {usr.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{usr.username}</div>
                        <div className="text-xs text-gray-400">{usr.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usr.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          usr.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {usr.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          usr.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {usr.is_admin ? 'Yönetici' : 'Kullanıcı'}
                        </span>
                        {usr.is_ldap && (
                          <span className="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            LDAP
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(usr)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          Düzenle
                        </button>
                        {usr.id !== user.id && (
                          <button
                            onClick={() => handleDelete(usr.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Sil
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">Henüz kullanıcı bulunmamaktadır.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Users;
