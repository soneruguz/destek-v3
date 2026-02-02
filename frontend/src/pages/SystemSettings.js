import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import NotificationSettings from '../components/NotificationSettings';
import ApiManagement from '../components/ApiManagement';

const SystemSettings = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('formSettings');
  const [config, setConfig] = useState({
    enable_teos_id: false,
    enable_citizenship_no: false,
    require_teos_id: false,
    require_citizenship_no: false
  });
  const [emailConfig, setEmailConfig] = useState({
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_use_tls: true,
    from_email: '',
    from_name: 'Destek Sistemi'
  });
  const [generalConfig, setGeneralConfig] = useState({
    app_name: 'Destek Sistemi',
    support_email: '',
    max_file_size_mb: 10,
    default_department_id: null,
    allowed_file_types: 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png',
    upload_directory: '/app/uploads',
    enable_ldap: false,
    ldap_server: '',
    ldap_port: 389,
    ldap_base_dn: '',
    ldap_bind_dn: '',
    ldap_bind_password: '',
    ldap_user_filter: '',
    custom_logo_url: null,
    require_manager_assignment: false,
    workflow_enabled: false,
    triage_user_id: null,
    triage_department_id: null,
    escalation_enabled: false,
    escalation_target_user_id: null,
    escalation_target_department_id: null,
    timeout_critical: 60,
    timeout_high: 240,
    timeout_medium: 480,
    timeout_low: 1440
  });
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingDepartment, setEditingDepartment] = useState(null);

  const [saving, setSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [departmentSaving, setDepartmentSaving] = useState(false);

  // useEffect'i koşullu ifadeden önce çağır
  useEffect(() => {
    // Kullanıcı admin değilse veri çekme
    if (!user?.is_admin) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/settings/');
        // Form verilerini ayarla
        setConfig({
          enable_teos_id: response.data.enable_teos_id || false,
          enable_citizenship_no: response.data.enable_citizenship_no || false,
          require_teos_id: response.data.require_teos_id || false,
          require_citizenship_no: response.data.require_citizenship_no || false
        });

        // Email config - undefined değerleri default değerlerle değiştir
        setEmailConfig({
          smtp_server: response.data.email?.smtp_server || '',
          smtp_port: response.data.email?.smtp_port || 587,
          smtp_username: response.data.email?.smtp_username || '',
          smtp_password: response.data.email?.smtp_password || '',
          smtp_use_tls: response.data.email?.smtp_use_tls ?? true,
          from_email: response.data.email?.from_email || '',
          from_name: response.data.email?.from_name || 'Destek Sistemi'
        });

        // General config - undefined değerleri default değerlerle değiştir  
        setGeneralConfig({
          app_name: response.data.general?.app_name || 'Destek Sistemi',
          support_email: response.data.general?.support_email || '',
          max_file_size_mb: response.data.general?.max_file_size_mb || 10,
          default_department_id: response.data.general?.default_department_id || null,
          allowed_file_types: response.data.general?.allowed_file_types || 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png',
          upload_directory: response.data.general?.upload_directory || '/app/uploads',
          enable_ldap: response.data.general?.enable_ldap || false,
          ldap_server: response.data.general?.ldap_server || '',
          ldap_port: response.data.general?.ldap_port || 389,
          ldap_base_dn: response.data.general?.ldap_base_dn || '',
          ldap_bind_dn: response.data.general?.ldap_bind_dn || '',
          ldap_bind_password: response.data.general?.ldap_bind_password || '',
          ldap_user_filter: response.data.general?.ldap_user_filter || '',
          custom_logo_url: response.data.general?.custom_logo_url || null,
          require_manager_assignment: response.data.general?.require_manager_assignment || false,
          workflow_enabled: response.data.general?.workflow_enabled || false,
          triage_user_id: response.data.general?.triage_user_id || null,
          triage_department_id: response.data.general?.triage_department_id || null,
          escalation_enabled: response.data.general?.escalation_enabled || false,
          escalation_target_user_id: response.data.general?.escalation_target_user_id || null,
          escalation_target_department_id: response.data.general?.escalation_target_department_id || null,
          timeout_critical: response.data.general?.timeout_critical || 60,
          timeout_high: response.data.general?.timeout_high || 240,
          timeout_medium: response.data.general?.timeout_medium || 480,
          timeout_low: response.data.general?.timeout_low || 1440
        });
      } catch (err) {
        console.error('Error fetching settings:', err);
        addToast('Sistem ayarları yüklenirken bir hata oluştu.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user, addToast]);

  useEffect(() => {
    if (!user?.is_admin) return;

    const fetchDepartmentsAndUsers = async () => {
      try {
        const [deptsRes, usersRes] = await Promise.all([
          axiosInstance.get('/departments/'),
          axiosInstance.get('/users/')
        ]);
        setDepartments(deptsRes.data || []);
        setUsers(usersRes.data || []);
      } catch (err) {
        console.error('Error fetching departments/users:', err);
      }
    };

    fetchDepartmentsAndUsers();
  }, [user]);

  const handleChange = (e) => {
    const { name, checked } = e.target;

    // Eğer alan devre dışı bırakılıyorsa zorunluluğu da kaldır
    if (name === 'enable_teos_id' && !checked) {
      setConfig(prev => ({ ...prev, [name]: checked, require_teos_id: false }));
    } else if (name === 'enable_citizenship_no' && !checked) {
      setConfig(prev => ({ ...prev, [name]: checked, require_citizenship_no: false }));
    } else {
      setConfig(prev => ({ ...prev, [name]: checked }));
    }
  };

  const handleEmailChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEmailConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
        type === 'number' ? parseInt(value) : value
    }));
  };

  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGeneralConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
        type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axiosInstance.put('/settings/general-config', config);
      addToast('Form ayarları başarıyla güncellendi', 'success');
    } catch (err) {
      console.error('Error updating system config:', err);
      addToast('Form ayarları güncellenirken bir hata oluştu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailSaving(true);

    // Boş string'leri null yaparak 422 EmailStr hatasını engelle
    const payload = Object.fromEntries(
      Object.entries(emailConfig).map(([k, v]) => [k, v === '' ? null : v])
    );

    try {
      await axiosInstance.put('/settings/email-config', payload);
      addToast('E-posta ayarları başarıyla güncellendi', 'success');
    } catch (err) {
      console.error('Error updating email config:', err);
      addToast('E-posta ayarları güncellenirken bir hata oluştu', 'error');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    setGeneralSaving(true);

    try {
      await axiosInstance.put('/settings/general-config', generalConfig);
      addToast('Genel ayarlar başarıyla güncellendi', 'success');
    } catch (err) {
      console.error('Error updating general config:', err);
      addToast('Genel ayarlar güncellenirken bir hata oluştu', 'error');
    } finally {
      setGeneralSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      await axiosInstance.post('/settings/test-email', {
        recipient_email: user.email // Test e-postası olarak aktif kullanıcının e-postasını kullan
      });
      addToast('Test e-postası başarıyla gönderildi', 'success');
    } catch (err) {
      console.error('Error sending test email:', err);
      addToast('Test e-postası gönderilirken bir hata oluştu', 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  const handleUpdateDepartmentManager = async (departmentId, managerId) => {
    setDepartmentSaving(true);
    try {
      const response = await axiosInstance.put(`/departments/${departmentId}`, {
        name: departments.find(d => d.id === departmentId)?.name,
        description: departments.find(d => d.id === departmentId)?.description,
        manager_id: managerId || null
      });

      setDepartments(prev =>
        prev.map(d => d.id === departmentId ? response.data : d)
      );
      addToast('Birim yöneticisi başarıyla güncellendi', 'success');
      setEditingDepartment(null);
    } catch (err) {
      console.error('Error updating department manager:', err);
      addToast('Birim yöneticisi güncellenirken bir hata oluştu', 'error');
    } finally {
      setDepartmentSaving(false);
    }
  };

  if (loading) {
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
      <h1 className="text-2xl font-semibold text-gray-900">Sistem Ayarları</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => handleTabChange('formSettings')}
            className={`${activeTab === 'formSettings'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Talep Formu Ayarları
          </button>
          <button
            onClick={() => handleTabChange('emailSettings')}
            className={`${activeTab === 'emailSettings'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            E-posta Ayarları
          </button>
          <button
            onClick={() => handleTabChange('notificationSettings')}
            className={`${activeTab === 'notificationSettings'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Bildirim Ayarları
          </button>
          <button
            onClick={() => handleTabChange('generalSettings')}
            className={`${activeTab === 'generalSettings'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Genel Ayarlar
          </button>
          <button
            onClick={() => handleTabChange('workflowSettings')}
            className={`${activeTab === 'workflowSettings'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            İş Akışı ve Yönlendirme
          </button>
          <button
            onClick={() => handleTabChange('departmentSettings')}
            className={`${activeTab === 'departmentSettings'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Birim Yönetimi
          </button>
          <button
            onClick={() => handleTabChange('apiSettings')}
            className={`${activeTab === 'apiSettings'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            API Entegrasyonları
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'formSettings' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Talep Formu Ayarları</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Talep formunda hangi alanların görüntüleneceğini ve zorunlu olacağını ayarlayın.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-base font-medium text-gray-900 mb-3">Teos ID Alanı</h4>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="enable_teos_id"
                            name="enable_teos_id"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={config.enable_teos_id}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="enable_teos_id" className="font-medium text-gray-700">Teos ID Alanını Etkinleştir</label>
                          <p className="text-gray-500">Talep formunda Teos ID alanını görünür yap.</p>
                        </div>
                      </div>

                      <div className="flex items-start pl-7">
                        <div className="flex items-center h-5">
                          <input
                            id="require_teos_id"
                            name="require_teos_id"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={config.require_teos_id}
                            onChange={handleChange}
                            disabled={!config.enable_teos_id}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="require_teos_id" className={`font-medium ${config.enable_teos_id ? 'text-gray-700' : 'text-gray-400'}`}>
                            Teos ID Alanını Zorunlu Yap
                          </label>
                          <p className={config.enable_teos_id ? 'text-gray-500' : 'text-gray-400'}>
                            Kullanıcılar talep oluştururken Teos ID girmeye zorla.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-base font-medium text-gray-900 mb-3">Vatandaşlık Numarası Alanı</h4>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="enable_citizenship_no"
                            name="enable_citizenship_no"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={config.enable_citizenship_no}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="enable_citizenship_no" className="font-medium text-gray-700">Vatandaşlık Numarası Alanını Etkinleştir</label>
                          <p className="text-gray-500">Talep formunda Vatandaşlık Numarası alanını görünür yap.</p>
                        </div>
                      </div>

                      <div className="flex items-start pl-7">
                        <div className="flex items-center h-5">
                          <input
                            id="require_citizenship_no"
                            name="require_citizenship_no"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={config.require_citizenship_no}
                            onChange={handleChange}
                            disabled={!config.enable_citizenship_no}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="require_citizenship_no" className={`font-medium ${config.enable_citizenship_no ? 'text-gray-700' : 'text-gray-400'}`}>
                            Vatandaşlık Numarası Alanını Zorunlu Yap
                          </label>
                          <p className={config.enable_citizenship_no ? 'text-gray-500' : 'text-gray-400'}>
                            Kullanıcılar talep oluştururken Vatandaşlık Numarası girmeye zorla.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-base font-medium text-gray-900 mb-3">Departman Yöneticisi Onay Süreci</h4>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="require_manager_assignment"
                            name="require_manager_assignment"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={generalConfig.require_manager_assignment}
                            onChange={handleGeneralChange}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="require_manager_assignment" className="font-medium text-gray-700">
                            Departman Yöneticisinin Talepler Üzerinde Önce İncelemesi Gereksin
                          </label>
                          <p className="text-gray-500">
                            Etkinse, birime açılan talepler otomatik olarak departman yöneticisine atanır. Yönetici talebi inceler ve uygun personele yönlendirir. Devre dışıysa, birim personeli talebi doğrudan görebilir ve üzerine alabilir.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={saving}
                >
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'emailSettings' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">E-posta Ayarları</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Sistem tarafından gönderilecek e-postaların yapılandırmasını ayarlayın.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit}>
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="smtp_server" className="block text-sm font-medium text-gray-700">
                        SMTP Sunucusu
                      </label>
                      <input
                        type="text"
                        name="smtp_server"
                        id="smtp_server"
                        value={emailConfig.smtp_server}
                        onChange={handleEmailChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="örn. smtp.gmail.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="smtp_port" className="block text-sm font-medium text-gray-700">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        name="smtp_port"
                        id="smtp_port"
                        value={emailConfig.smtp_port}
                        onChange={handleEmailChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="örn. 587"
                      />
                    </div>

                    <div>
                      <label htmlFor="smtp_username" className="block text-sm font-medium text-gray-700">
                        SMTP Kullanıcı Adı
                      </label>
                      <input
                        type="text"
                        name="smtp_username"
                        id="smtp_username"
                        value={emailConfig.smtp_username}
                        onChange={handleEmailChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="örn. myemail@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="smtp_password" className="block text-sm font-medium text-gray-700">
                        SMTP Şifresi
                      </label>
                      <input
                        type="password"
                        name="smtp_password"
                        id="smtp_password"
                        value={emailConfig.smtp_password}
                        onChange={handleEmailChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label htmlFor="from_email" className="block text-sm font-medium text-gray-700">
                        Gönderen E-posta Adresi
                      </label>
                      <input
                        type="email"
                        name="from_email"
                        id="from_email"
                        value={emailConfig.from_email}
                        onChange={handleEmailChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="örn. support@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="from_name" className="block text-sm font-medium text-gray-700">
                        Gönderen Adı
                      </label>
                      <input
                        type="text"
                        name="from_name"
                        id="from_name"
                        value={emailConfig.from_name}
                        onChange={handleEmailChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="örn. Destek Sistemi"
                      />
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="smtp_use_tls"
                        name="smtp_use_tls"
                        type="checkbox"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        checked={emailConfig.smtp_use_tls}
                        onChange={handleEmailChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="smtp_use_tls" className="font-medium text-gray-700">
                        TLS Güvenliği Kullan
                      </label>
                      <p className="text-gray-500">
                        E-posta sunucusuyla iletişim kurarken TLS güvenliğini kullanın.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 sm:px-6 flex justify-between">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {testingEmail ? 'Test Yapılıyor...' : 'Test E-postası Gönder'}
                </button>
                <button
                  type="submit"
                  disabled={emailSaving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {emailSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'notificationSettings' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Bildirim Ayarları</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Sistem genelinde bildirim ayarlarını yönetin.
              </p>
            </div>

            <div className="px-4 py-5 sm:p-6">
              <NotificationSettings />
            </div>
          </div>
        )}

        {activeTab === 'generalSettings' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Genel Ayarlar</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Sistem genelinde kullanılan genel ayarları yapılandırın.
              </p>
            </div>

            <form onSubmit={handleGeneralSubmit}>
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-6">
                  <h4 className="text-base font-medium text-gray-900">Temel Ayarlar</h4>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="app_name" className="block text-sm font-medium text-gray-700">
                        Uygulama Adı
                      </label>
                      <input
                        type="text"
                        name="app_name"
                        id="app_name"
                        value={generalConfig.app_name}
                        onChange={handleGeneralChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label htmlFor="support_email" className="block text-sm font-medium text-gray-700">
                        Destek E-posta Adresi
                      </label>
                      <input
                        type="email"
                        name="support_email"
                        id="support_email"
                        value={generalConfig.support_email}
                        onChange={handleGeneralChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <h4 className="text-base font-medium text-gray-900 pt-4">Görünüm Ayarları</h4>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Logo Yükle</label>
                      <div className="mt-1 flex items-center">
                        {generalConfig.custom_logo_url && (
                          <span className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 mr-4">
                            <img src={`${window.location.origin}/uploads${generalConfig.custom_logo_url}`} alt="Logo" className="h-full w-full object-contain" />
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            if (e.target.files[0]) {
                              const formData = new FormData();
                              formData.append('file', e.target.files[0]);
                              try {
                                const res = await axiosInstance.post('/settings/upload-logo', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                setGeneralConfig(prev => ({ ...prev, custom_logo_url: res.data.url }));
                                addToast('Logo başarıyla yüklendi', 'success');
                              } catch (err) {
                                console.error(err);
                                addToast('Logo yüklenirken hata oluştu', 'error');
                              }
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Giriş sayfasında görüntülenecek logo (PNG, JPG tavsiye edilir).</p>
                    </div>
                  </div>

                  <h4 className="text-base font-medium text-gray-900 pt-4">Dosya Yükleme Ayarları</h4>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="max_file_size_mb" className="block text-sm font-medium text-gray-700">
                        Maksimum Dosya Boyutu (MB)
                      </label>
                      <input
                        type="number"
                        name="max_file_size_mb"
                        id="max_file_size_mb"
                        value={generalConfig.max_file_size_mb}
                        onChange={handleGeneralChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label htmlFor="default_department_id" className="block text-sm font-medium text-gray-700">
                        Varsayılan Birim
                      </label>
                      <select
                        name="default_department_id"
                        id="default_department_id"
                        value={generalConfig.default_department_id || ''}
                        onChange={handleGeneralChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="">Seçiniz...</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Yeni talep oluşturma ekranında ön tanımlı olarak gösterilecek birim</p>
                    </div>

                    <div>
                      <label htmlFor="allowed_file_types" className="block text-sm font-medium text-gray-700">
                        İzin Verilen Dosya Türleri
                      </label>
                      <input
                        type="text"
                        name="allowed_file_types"
                        id="allowed_file_types"
                        value={generalConfig.allowed_file_types}
                        onChange={handleGeneralChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                      <p className="mt-1 text-xs text-gray-500">Virgülle ayırarak girin (örn. pdf,doc,jpg)</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="upload_directory" className="block text-sm font-medium text-gray-700">
                        Dosya Yükleme Dizini
                      </label>
                      <input
                        type="text"
                        name="upload_directory"
                        id="upload_directory"
                        value={generalConfig.upload_directory}
                        onChange={handleGeneralChange}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Yüklenen dosyaların kaydedileceği mutlak yol (örn. /app/uploads veya /mnt/storage/uploads).
                        Docker container'a mount edilmiş bir dizin kullanarak container boyutunu kontrol edebilirsiniz.
                      </p>
                    </div>
                  </div>

                  <h4 className="text-base font-medium text-gray-900 pt-4">LDAP Entegrasyonu</h4>
                  <div className="flex items-start mb-4">
                    <div className="flex items-center h-5">
                      <input
                        id="enable_ldap"
                        name="enable_ldap"
                        type="checkbox"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        checked={generalConfig.enable_ldap}
                        onChange={handleGeneralChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="enable_ldap" className="font-medium text-gray-700">
                        LDAP Entegrasyonunu Etkinleştir
                      </label>
                      <p className="text-gray-500">
                        Kullanıcı kimlik doğrulaması için LDAP sunucusunu kullanın.
                      </p>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${!generalConfig.enable_ldap ? 'opacity-50' : ''}`}>
                    <div>
                      <label htmlFor="ldap_server" className="block text-sm font-medium text-gray-700">
                        LDAP Sunucu Adresi
                      </label>
                      <input
                        type="text"
                        name="ldap_server"
                        id="ldap_server"
                        value={generalConfig.ldap_server}
                        onChange={handleGeneralChange}
                        disabled={!generalConfig.enable_ldap}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label htmlFor="ldap_port" className="block text-sm font-medium text-gray-700">
                        LDAP Port
                      </label>
                      <input
                        type="number"
                        name="ldap_port"
                        id="ldap_port"
                        value={generalConfig.ldap_port}
                        onChange={handleGeneralChange}
                        disabled={!generalConfig.enable_ldap}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label htmlFor="ldap_base_dn" className="block text-sm font-medium text-gray-700">
                        LDAP Base DN
                      </label>
                      <input
                        type="text"
                        name="ldap_base_dn"
                        id="ldap_base_dn"
                        value={generalConfig.ldap_base_dn}
                        onChange={handleGeneralChange}
                        disabled={!generalConfig.enable_ldap}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="dc=example,dc=com"
                      />
                    </div>

                    <div>
                      <label htmlFor="ldap_bind_dn" className="block text-sm font-medium text-gray-700">
                        LDAP Bind DN
                      </label>
                      <input
                        type="text"
                        name="ldap_bind_dn"
                        id="ldap_bind_dn"
                        value={generalConfig.ldap_bind_dn}
                        onChange={handleGeneralChange}
                        disabled={!generalConfig.enable_ldap}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="cn=admin,dc=example,dc=com"
                      />
                    </div>

                    <div>
                      <label htmlFor="ldap_bind_password" className="block text-sm font-medium text-gray-700">
                        LDAP Bind Şifresi
                      </label>
                      <input
                        type="password"
                        name="ldap_bind_password"
                        id="ldap_bind_password"
                        value={generalConfig.ldap_bind_password}
                        onChange={handleGeneralChange}
                        disabled={!generalConfig.enable_ldap}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label htmlFor="ldap_user_filter" className="block text-sm font-medium text-gray-700">
                        LDAP Kullanıcı Filtresi
                      </label>
                      <input
                        type="text"
                        name="ldap_user_filter"
                        id="ldap_user_filter"
                        value={generalConfig.ldap_user_filter}
                        onChange={handleGeneralChange}
                        disabled={!generalConfig.enable_ldap}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="(objectClass=person)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="submit"
                  disabled={generalSaving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {generalSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        )}
        {activeTab === 'workflowSettings' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">İş Akışı ve Yönlendirme Ayarları</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Taleplerin merkezi bir birimden geçmesini ve zaman aşımına uğrayan taleplerin otomatik yönlendirilmesini yapılandırın.
                </p>
              </div>
              <div className="flex items-center bg-white px-4 py-2 rounded-lg border border-gray-200">
                <input
                  id="workflow_enabled"
                  name="workflow_enabled"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={generalConfig.workflow_enabled}
                  onChange={handleGeneralChange}
                />
                <label htmlFor="workflow_enabled" className="ml-2 block text-sm font-bold text-gray-900">
                  Sistemi Etkinleştir
                </label>
              </div>
            </div>

            <form onSubmit={handleGeneralSubmit}>
              <div className={`px-4 py-5 sm:p-6 ${!generalConfig.workflow_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-8">
                  {/* Merkezi Yönlendirme */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-base font-medium text-blue-900 mb-4 flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Merkezi Yönlendirme
                    </h4>
                    <p className="text-sm text-blue-700 mb-4">
                      Tüm yeni talepler önce burada belirlenen kullanıcıya veya birime atanır. Yönlendirici, talebi uygun kişi/birime yönlendirmekle yükümlüdür.
                    </p>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Yönlendirici Kullanıcı</label>
                        <select
                          name="triage_user_id"
                          value={generalConfig.triage_user_id || ''}
                          onChange={(e) => setGeneralConfig(prev => ({ ...prev, triage_user_id: e.target.value ? parseInt(e.target.value) : null }))}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        >
                          <option value="">Seçilmedi (Birim bazlı yönlendirme aktif olur)</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Yönlendirici Birim</label>
                        <select
                          name="triage_department_id"
                          value={generalConfig.triage_department_id || ''}
                          onChange={(e) => setGeneralConfig(prev => ({ ...prev, triage_department_id: e.target.value ? parseInt(e.target.value) : null }))}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        >
                          <option value="">Seçilmedi</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Otomatik Atama */}
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-medium text-orange-900 flex items-center">
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Otomatik Atama
                      </h4>
                      <div className="flex items-center">
                        <input
                          id="escalation_enabled"
                          name="escalation_enabled"
                          type="checkbox"
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          checked={generalConfig.escalation_enabled}
                          onChange={handleGeneralChange}
                        />
                        <label htmlFor="escalation_enabled" className="ml-2 block text-sm font-medium text-gray-700">Etkinleştir</label>
                      </div>
                    </div>

                    <div className={`space-y-6 ${!generalConfig.escalation_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                      <p className="text-sm text-orange-700">
                        Belirlenen sürede (dakika cinsinden) atanmayan veya işlem görmeyen talepler otomatik olarak aşağıdaki hedefe yönlendirilir.
                      </p>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Hedef Kullanıcı (Yedek)</label>
                          <select
                            name="escalation_target_user_id"
                            value={generalConfig.escalation_target_user_id || ''}
                            onChange={(e) => setGeneralConfig(prev => ({ ...prev, escalation_target_user_id: e.target.value ? parseInt(e.target.value) : null }))}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                          >
                            <option value="">Seçilmedi</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Hedef Birim (Yedek)</label>
                          <select
                            name="escalation_target_department_id"
                            value={generalConfig.escalation_target_department_id || ''}
                            onChange={(e) => setGeneralConfig(prev => ({ ...prev, escalation_target_department_id: e.target.value ? parseInt(e.target.value) : null }))}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                          >
                            <option value="">Seçilmedi</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 pt-4 border-t border-orange-200">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase">Kritik (Dakika)</label>
                          <input
                            type="number"
                            name="timeout_critical"
                            value={generalConfig.timeout_critical}
                            onChange={handleGeneralChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase">Yüksek (Dakika)</label>
                          <input
                            type="number"
                            name="timeout_high"
                            value={generalConfig.timeout_high}
                            onChange={handleGeneralChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase">Orta (Dakika)</label>
                          <input
                            type="number"
                            name="timeout_medium"
                            value={generalConfig.timeout_medium}
                            onChange={handleGeneralChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase">Düşük (Dakika)</label>
                          <input
                            type="number"
                            name="timeout_low"
                            value={generalConfig.timeout_low}
                            onChange={handleGeneralChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={generalSaving}
                >
                  {generalSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        )}
        {activeTab === 'departmentSettings' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Birim Yönetimi</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Birimlere yönetici atayın
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Birim Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Birim Yöneticisi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map(dept => (
                    <tr key={dept.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {dept.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingDepartment === dept.id ? (
                          <select
                            value={dept.manager_id || ''}
                            onChange={(e) => {
                              const managerId = e.target.value ? parseInt(e.target.value) : null;
                              handleUpdateDepartmentManager(dept.id, managerId);
                            }}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            disabled={departmentSaving}
                          >
                            <option value="">Seç...</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.full_name} ({u.email})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>
                            {dept.manager_id
                              ? users.find(u => u.id === dept.manager_id)?.full_name || 'Bilinmiyor'
                              : 'Atanmamış'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingDepartment === dept.id ? (
                          <button
                            onClick={() => setEditingDepartment(null)}
                            className="text-gray-600 hover:text-gray-900"
                            disabled={departmentSaving}
                          >
                            İptal
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingDepartment(dept.id)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Düzenle
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* API Entegrasyonları Tab */}
        {activeTab === 'apiSettings' && (
          <ApiManagement />
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
