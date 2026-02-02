import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import NotificationSettings from '../components/NotificationSettings';

const Profile = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    password_confirm: ''
  });
  
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        full_name: user.full_name || '',
        password: '',
        password_confirm: ''
      });
      
      // Kullanıcı departmanlarını getir
      const fetchUserDepartments = async () => {
        try {
          const response = await axiosInstance.get(`users/${user.id}/departments/`);
          setDepartments(response.data);
        } catch (err) {
          // 403 hatası normaldir - admin olmayan kullanıcılar kendi departmanlarını göremez
          // addToast('Departman bilgileri yüklenirken bir hata oluştu.', 'error');
        } finally {
          setLoading(false);
        }
      };
      
      fetchUserDepartments();
    }
  }, [user, addToast]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Şifre doğrulama
    if (formData.password && formData.password !== formData.password_confirm) {
      addToast('Şifreler eşleşmiyor.', 'error');
      return;
    }
    
    setSaving(true);
    
    try {
      // LDAP hesapları şifrelerini güncelleyemez
      if (user.is_ldap && formData.password) {
        addToast('LDAP hesapları şifrelerini bu sistemden değiştiremez.', 'error');
        setSaving(false);
        return;
      }
      
      // Güncellenecek verileri hazırla
      const updateData = {
        email: formData.email,
        full_name: formData.full_name
      };
      
      // Şifre güncellenmesi istenmişse ekle
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await axiosInstance.put(`users/${user.id}/`, updateData);
      addToast('Profil bilgileriniz başarıyla güncellendi.', 'success');
      
      // Şifre alanlarını temizle
      setFormData(prev => ({
        ...prev,
        password: '',
        password_confirm: ''
      }));
    } catch (err) {
      console.error('Error updating profile:', err);
      // Show error message from backend if available
      const errorMessage = err.response?.data?.detail || 'Profil güncellenirken bir hata oluştu.';
      addToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Profil Bilgilerim</h1>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Kullanıcı Bilgileri */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Hesap Bilgileri</h2>
          
          <div className="space-y-4">
            <div>
              <span className="block text-sm font-medium text-gray-700">Kullanıcı Adı</span>
              <span className="mt-1 block text-sm text-gray-900">{user.username}</span>
            </div>
            
            <div>
              <span className="block text-sm font-medium text-gray-700">Hesap Türü</span>
              <span className="mt-1 block text-sm text-gray-900">
                {user.is_ldap ? 'LDAP / Active Directory' : 'Yerel Hesap'}
              </span>
            </div>
            
            <div>
              <span className="block text-sm font-medium text-gray-700">Rol</span>
              <span className="mt-1 block text-sm text-gray-900">
                {user.is_admin ? 'Yönetici' : 'Kullanıcı'}
              </span>
            </div>
            
            <div>
              <span className="block text-sm font-medium text-gray-700">Departmanlar</span>
              <div className="mt-1">
                {departments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {departments.map(dept => (
                      <span key={dept.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {dept.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Departman atanmamış</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Profil Düzenleme Formu */}
        <div className="bg-white shadow rounded-lg p-6 xl:col-span-2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Profil Bilgilerini Düzenle</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Ad Soyad
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
              
              {!user.is_ldap && (
                <>
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-md font-medium text-gray-900 mb-2">Şifre Değiştir</h3>
                    <p className="text-sm text-gray-500 mb-3">Şifrenizi değiştirmek istemiyorsanız bu alanları boş bırakın.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                          Yeni Şifre
                        </label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">
                          Yeni Şifre (Tekrar)
                        </label>
                        <input
                          type="password"
                          id="password_confirm"
                          name="password_confirm"
                          value={formData.password_confirm}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={saving}
                >
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="xl:col-span-1">
          <NotificationSettings />
        </div>
      </div>
    </div>
  );
};

export default Profile;
