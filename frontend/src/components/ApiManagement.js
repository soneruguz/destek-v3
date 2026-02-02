import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axios';
import { useToast } from '../contexts/ToastContext';

const ApiManagement = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newSecret, setNewSecret] = useState('');
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const { showToast, addToast } = useToast();
  const toast = showToast || addToast;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    can_create_tickets: true,
    can_read_tickets: true,
    can_update_tickets: false,
    can_add_comments: true,
    allowed_departments: [],
    rate_limit_per_minute: 60,
    default_department_id: '',
    contact_user_id: ''
  });

  const [webhookForm, setWebhookForm] = useState({
    url: '',
    events: [],
    secret: '',
    is_active: true,
    max_retries: 3,
    retry_delay_seconds: 60
  });

  const eventTypes = [
    { value: 'ticket.created', label: 'Talep Oluşturuldu', icon: '📝' },
    { value: 'ticket.updated', label: 'Talep Güncellendi', icon: '✏️' },
    { value: 'ticket.status_changed', label: 'Durum Değişti', icon: '🔄' },
    { value: 'ticket.assigned', label: 'Talep Atandı', icon: '👤' },
    { value: 'ticket.closed', label: 'Talep Kapandı', icon: '✅' },
    { value: 'ticket.reopened', label: 'Talep Yeniden Açıldı', icon: '🔓' },
    { value: 'comment.added', label: 'Yorum Eklendi', icon: '💬' },
    { value: 'attachment.added', label: 'Dosya Eklendi', icon: '📎' }
  ];

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/api-clients/');
      setClients(response.data);
    } catch (error) {
      toast('API client listesi alınamadı', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDepartments = async () => {
    try {
      const response = await axiosInstance.get('/departments/');
      setDepartments(response.data);
    } catch (error) {
      console.error('Departmanlar alınamadı:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Kullanıcılar alınamadı:', error);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchDepartments();
    fetchUsers();
  }, [fetchClients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        default_department_id: formData.default_department_id || null,
        contact_user_id: formData.contact_user_id || null,
        allowed_departments: formData.allowed_departments.length > 0 ? formData.allowed_departments : null
      };

      if (selectedClient) {
        await axiosInstance.put(`/admin/api-clients/${selectedClient.id}`, payload);
        toast('API Client güncellendi', 'success');
      } else {
        const response = await axiosInstance.post('/admin/api-clients/', payload);
        setNewSecret(response.data.api_secret);
        setSelectedClient(response.data);
        setShowSecretModal(true);
        toast('API Client oluşturuldu', 'success');
      }
      setShowModal(false);
      fetchClients();
    } catch (error) {
      toast(error.response?.data?.detail || 'İşlem başarısız', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu API Client silinecek. Emin misiniz?')) return;
    try {
      await axiosInstance.delete(`/admin/api-clients/${id}`);
      toast('API Client silindi', 'success');
      fetchClients();
    } catch (error) {
      toast('Silme işlemi başarısız', 'error');
    }
  };

  const handleRegenerateSecret = async (client) => {
    if (!window.confirm('Mevcut API Secret geçersiz olacak. Emin misiniz?')) return;
    try {
      const response = await axiosInstance.post(`/admin/api-clients/${client.id}/regenerate-secret`);
      setNewSecret(response.data.api_secret);
      setSelectedClient(client);
      setShowSecretModal(true);
      toast('API Secret yenilendi', 'success');
    } catch (error) {
      toast('Secret yenileme başarısız', 'error');
    }
  };

  const handleToggleActive = async (client) => {
    try {
      await axiosInstance.put(`/admin/api-clients/${client.id}`, { is_active: !client.is_active });
      toast(client.is_active ? 'API Client devre dışı bırakıldı' : 'API Client aktif edildi', 'success');
      fetchClients();
    } catch (error) {
      toast('İşlem başarısız', 'error');
    }
  };

  const openEditModal = (client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      description: client.description || '',
      can_create_tickets: client.can_create_tickets,
      can_read_tickets: client.can_read_tickets,
      can_update_tickets: client.can_update_tickets,
      can_add_comments: client.can_add_comments,
      allowed_departments: client.allowed_departments || [],
      rate_limit_per_minute: client.rate_limit_per_minute,
      default_department_id: client.default_department_id || '',
      contact_user_id: client.contact_user_id || ''
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setSelectedClient(null);
    setFormData({
      name: '',
      description: '',
      can_create_tickets: true,
      can_read_tickets: true,
      can_update_tickets: false,
      can_add_comments: true,
      allowed_departments: [],
      rate_limit_per_minute: 60,
      default_department_id: '',
      contact_user_id: ''
    });
    setShowModal(true);
  };

  const openDetailModal = (client) => {
    setSelectedClient(client);
    fetchWebhooks(client.id);
    setShowDetailModal(true);
  };

  // Webhook işlemleri
  const fetchWebhooks = async (clientId) => {
    try {
      const response = await axiosInstance.get(`/admin/api-clients/${clientId}/webhooks`);
      setWebhooks(response.data);
    } catch (error) {
      toast('Webhook listesi alınamadı', 'error');
    }
  };

  const openWebhookModal = (client) => {
    setSelectedClient(client);
    setEditingWebhook(null);
    setWebhookForm({
      url: '',
      events: [],
      secret: '',
      is_active: true,
      max_retries: 3,
      retry_delay_seconds: 60
    });
    setShowWebhookModal(true);
  };

  const handleWebhookSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(`/admin/api-clients/${selectedClient.id}/webhooks`, webhookForm);
      toast('Webhook eklendi', 'success');
      fetchWebhooks(selectedClient.id);
      setWebhookForm({
        url: '',
        events: [],
        secret: '',
        is_active: true,
        max_retries: 3,
        retry_delay_seconds: 60
      });
      setShowWebhookModal(false);
    } catch (error) {
      toast(error.response?.data?.detail || 'Webhook eklenemedi', 'error');
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!window.confirm('Bu webhook silinecek. Emin misiniz?')) return;
    try {
      await axiosInstance.delete(`/admin/api-clients/${selectedClient.id}/webhooks/${webhookId}`);
      toast('Webhook silindi', 'success');
      fetchWebhooks(selectedClient.id);
    } catch (error) {
      toast('Silme işlemi başarısız', 'error');
    }
  };

  const handleTestWebhook = async (webhookId) => {
    try {
      const response = await axiosInstance.post(`/admin/api-clients/${selectedClient.id}/webhooks/${webhookId}/test`);
      if (response.data.success) {
        toast(`Test başarılı! Status: ${response.data.status_code}`, 'success');
      } else {
        toast(`Test başarısız: ${response.data.error || response.data.status_code}`, 'error');
      }
    } catch (error) {
      toast('Test isteği gönderilemedi', 'error');
    }
  };

  const handleViewLogs = async (webhookId) => {
    try {
      const response = await axiosInstance.get(`/admin/api-clients/${selectedClient.id}/webhooks/${webhookId}/logs`);
      setWebhookLogs(response.data);
      setShowLogsModal(true);
    } catch (error) {
      toast('Loglar alınamadı', 'error');
    }
  };

  const copyToClipboard = (text, label = '') => {
    navigator.clipboard.writeText(text);
    toast(`${label || 'Değer'} panoya kopyalandı`, 'success');
  };

  // API Base URL - Önce env, yoksa hostname'e göre çıkar
  const getApiBaseUrl = () => {
    return `${window.location.origin}/api`;
  };
  
  const API_BASE_URL = getApiBaseUrl();

  const apiEndpoints = [
    { method: 'POST', path: '/external/tickets', desc: 'Yeni talep oluştur', permission: 'can_create_tickets' },
    { method: 'GET', path: '/external/tickets', desc: 'Talepleri listele', permission: 'can_read_tickets' },
    { method: 'GET', path: '/external/tickets/{id}', desc: 'Talep detayı', permission: 'can_read_tickets' },
    { method: 'GET', path: '/external/tickets/by-ref/{ref}', desc: 'External ref ile sorgula', permission: 'can_read_tickets' },
    { method: 'PUT', path: '/external/tickets/{id}', desc: 'Talep güncelle', permission: 'can_update_tickets' },
    { method: 'POST', path: '/external/tickets/{id}/comments', desc: 'Yorum ekle', permission: 'can_add_comments' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* API Bilgileri */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">API Bilgileri</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Harici uygulamalarınızdan destek talebi oluşturun, takip edin ve yönetin.
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {/* Base URL */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
            <div className="flex items-center">
              <code className="flex-1 bg-gray-100 px-4 py-2.5 rounded-lg font-mono text-sm">
                {API_BASE_URL}/external
              </code>
              <button
                onClick={() => copyToClipboard(`${API_BASE_URL}/external`, 'Base URL')}
                className="ml-3 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 border border-primary-200 rounded-lg"
              >
                Kopyala
              </button>
              <a
                href="/API_ENTEGRASYONU.md"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg"
              >
                Dokümantasyon
              </a>
            </div>
          </div>

          {/* Kimlik Doğrulama */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Kimlik Doğrulama</label>
            <p className="text-sm text-gray-600">
              Tüm isteklerde aşağıdaki HTTP header'larını gönderin:
            </p>
            <div className="mt-2 bg-gray-50 rounded-lg p-3 font-mono text-sm">
              <div><span className="text-gray-500">X-API-Key:</span> <span className="text-primary-600">&lt;api_key&gt;</span></div>
              <div><span className="text-gray-500">X-API-Secret:</span> <span className="text-primary-600">&lt;api_secret&gt;</span></div>
            </div>
          </div>

          {/* Endpoint Listesi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kullanılabilir Endpoint'ler</label>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {apiEndpoints.map((ep, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                          ep.method === 'GET' ? 'bg-green-500' : 
                          ep.method === 'POST' ? 'bg-blue-500' : 
                          ep.method === 'PUT' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-sm text-gray-700">{ep.path}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{ep.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* API Client Yönetimi */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">API İstemcileri</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Entegre sistemler için API erişim anahtarlarını yönetin
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            + Yeni API İstemcisi
          </button>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {/* API Client Cards */}
          {clients.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 mb-4">Henüz API istemcisi tanımlanmamış</p>
              <button
                onClick={openNewModal}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                İlk API istemcisini oluştur →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <div 
                  key={client.id} 
                  className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${
                    client.is_active ? 'border-gray-200 hover:border-primary-300' : 'border-red-200 bg-red-50'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                          client.is_active ? 'bg-primary-600' : 'bg-gray-400'
                        }`}>
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-semibold text-gray-900">{client.name}</h4>
                          <p className="text-xs text-gray-500 truncate max-w-[150px]">{client.description || 'Açıklama yok'}</p>
                        </div>
                      </div>
                      <button
                    onClick={() => handleToggleActive(client)}
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      client.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {client.is_active ? '● Aktif' : '○ Pasif'}
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* İzinler */}
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">İzinler</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {client.can_create_tickets && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Oluştur</span>
                    )}
                    {client.can_read_tickets && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Oku</span>
                    )}
                    {client.can_update_tickets && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">Güncelle</span>
                    )}
                    {client.can_add_comments && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Yorum</span>
                    )}
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">API Key</span>
                  <div className="flex items-center mt-1">
                    <code className="flex-1 text-xs bg-gray-100 px-2 py-1 rounded font-mono truncate">
                      {client.api_key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(client.api_key, 'API Key')}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Kopyala"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Son Kullanım */}
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Son kullanım:</span>{' '}
                  {client.last_used_at
                    ? new Date(client.last_used_at).toLocaleString('tr-TR')
                    : 'Hiç kullanılmadı'}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => openDetailModal(client)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Detaylar →
                  </button>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openWebhookModal(client)}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Webhook Ekle"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(client)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Düzenle"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRegenerateSecret(client)}
                      className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                      title="Secret Yenile"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Sil"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowDetailModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl ${
                    selectedClient.is_active ? 'bg-primary-600' : 'bg-gray-400'
                  }`}>
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{selectedClient.name}</h3>
                    <p className="text-sm text-gray-500">{selectedClient.description || 'Açıklama yok'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* API Credentials */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">API Kimlik Bilgileri</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">API Key</label>
                      <div className="flex items-center mt-1">
                        <code className="flex-1 text-sm bg-white border px-3 py-2 rounded font-mono">
                          {selectedClient.api_key}
                        </code>
                        <button
                          onClick={() => copyToClipboard(selectedClient.api_key, 'API Key')}
                          className="ml-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded border border-primary-200"
                        >
                          Kopyala
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center text-yellow-800">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm">API Secret sadece oluşturulduğunda gösterilir</span>
                      </div>
                      <button
                        onClick={() => handleRegenerateSecret(selectedClient)}
                        className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded font-medium"
                      >
                        Yeni Secret Oluştur
                      </button>
                    </div>
                  </div>
                </div>

                {/* Webhooks Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase">Webhook'lar</h4>
                    <button
                      onClick={() => openWebhookModal(selectedClient)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Yeni Webhook
                    </button>
                  </div>
                  {webhooks.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <p className="text-gray-500 text-sm">Henüz webhook tanımlanmamış</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {webhooks.map((webhook) => (
                        <div key={webhook.id} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${webhook.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                <code className="text-sm font-mono">{webhook.url}</code>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {webhook.events.map((event) => {
                                  const eventInfo = eventTypes.find(e => e.value === event);
                                  return (
                                    <span key={event} className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                                      {eventInfo?.icon} {eventInfo?.label || event}
                                    </span>
                                  );
                                })}
                              </div>
                              {webhook.failure_count > 0 && (
                                <p className="text-xs text-red-500 mt-1">⚠️ {webhook.failure_count} başarısız deneme</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 ml-4">
                              <button
                                onClick={() => handleTestWebhook(webhook.id)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Test Et"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleViewLogs(webhook.id)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                                title="Loglar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteWebhook(webhook.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Sil"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Usage Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Rate Limit</h4>
                    <p className="text-2xl font-bold text-gray-900">{selectedClient.rate_limit_per_minute}</p>
                    <p className="text-xs text-gray-500">istek/dakika</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Son Kullanım</h4>
                    <p className="text-sm text-gray-900">
                      {selectedClient.last_used_at
                        ? new Date(selectedClient.last_used_at).toLocaleString('tr-TR')
                        : 'Hiç kullanılmadı'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedClient ? 'Entegrasyonu Düzenle' : 'Yeni Entegrasyon Oluştur'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uygulama Adı *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Muhasebe Sistemi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.rate_limit_per_minute}
                        onChange={(e) => setFormData({ ...formData, rate_limit_per_minute: parseInt(e.target.value) })}
                        className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 pr-20 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">istek/dk</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Bu entegrasyon ne için kullanılıyor?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Varsayılan Departman</label>
                    <select
                      value={formData.default_department_id}
                      onChange={(e) => setFormData({ ...formData, default_department_id: e.target.value })}
                      className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Seçiniz</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">İletişim Sorumlusu</label>
                    <select
                      value={formData.contact_user_id}
                      onChange={(e) => setFormData({ ...formData, contact_user_id: e.target.value })}
                      className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Seçiniz</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>{user.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">API İzinleri</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.can_create_tickets}
                        onChange={(e) => setFormData({ ...formData, can_create_tickets: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-700">Talep Oluşturma</span>
                        <p className="text-xs text-gray-500">POST /api/external/tickets</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.can_read_tickets}
                        onChange={(e) => setFormData({ ...formData, can_read_tickets: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-700">Talep Okuma</span>
                        <p className="text-xs text-gray-500">GET /api/external/tickets</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.can_update_tickets}
                        onChange={(e) => setFormData({ ...formData, can_update_tickets: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-700">Talep Güncelleme</span>
                        <p className="text-xs text-gray-500">PUT /api/external/tickets/{'{id}'}</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.can_add_comments}
                        onChange={(e) => setFormData({ ...formData, can_add_comments: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-700">Yorum Ekleme</span>
                        <p className="text-xs text-gray-500">POST /api/external/tickets/{'{id}'}/comments</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    {selectedClient ? 'Güncelle' : 'Oluştur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Secret Modal */}
      {showSecretModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-yellow-100 mb-4">
                  <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">API Kimlik Bilgileri</h3>
                <p className="text-sm text-red-600 mb-4">
                  ⚠️ API Secret sadece bir kez gösterilir. Güvenli bir yere kaydedin!
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 text-left space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">API Key</label>
                    <div className="flex items-center">
                      <code className="flex-1 text-sm bg-white p-2 rounded border font-mono break-all">
                        {selectedClient?.api_key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedClient?.api_key, 'API Key')}
                        className="ml-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">API Secret</label>
                    <div className="flex items-center">
                      <code className="flex-1 text-sm bg-red-50 p-2 rounded border border-red-200 font-mono break-all text-red-700 font-bold">
                        {newSecret}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newSecret, 'API Secret')}
                        className="ml-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowSecretModal(false);
                    setNewSecret('');
                  }}
                  className="mt-6 w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Anladım, Kaydettim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowWebhookModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Yeni Webhook Ekle</h3>
                <button
                  onClick={() => setShowWebhookModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Webhook Açıklama */}
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">📡 Webhook Nedir?</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Webhook, sistemimizde bir olay gerçekleştiğinde (örn. yeni talep açıldı) <strong>sizin belirlediğiniz URL'e otomatik bildirim gönderen</strong> bir mekanizmadır.
                </p>
                <p className="text-sm text-blue-700">
                  <strong>URL olarak ne yazmalıyım?</strong> Kendi sisteminizde webhook isteklerini karşılayacak bir endpoint oluşturun ve o adresi buraya girin. 
                  Örnek: <code className="bg-blue-100 px-1 rounded">https://erp.sirketiniz.com/api/webhooks/destek</code>
                </p>
              </div>

              <form onSubmit={handleWebhookSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL *</label>
                  <input
                    type="url"
                    required
                    value={webhookForm.url}
                    onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://sizin-sisteminiz.com/api/webhooks/destek"
                  />
                  <p className="text-xs text-gray-500 mt-1">Sizin sisteminizin adresi - biz bu URL'e POST isteği göndereceğiz</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
                  <input
                    type="text"
                    value={webhookForm.secret}
                    onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="İmza doğrulama için (opsiyonel)"
                  />
                  <p className="text-xs text-gray-500 mt-1">İsteklerin X-Webhook-Signature header'ı ile imzalanması için</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Dinlenecek Olaylar *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {eventTypes.map((event) => (
                      <label 
                        key={event.value} 
                        className={`flex items-center p-2.5 border rounded-lg cursor-pointer transition-colors ${
                          webhookForm.events.includes(event.value) 
                            ? 'bg-primary-50 border-primary-300' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={webhookForm.events.includes(event.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWebhookForm({ ...webhookForm, events: [...webhookForm.events, event.value] });
                            } else {
                              setWebhookForm({ ...webhookForm, events: webhookForm.events.filter(ev => ev !== event.value) });
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm">{event.icon} {event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yeniden Deneme</label>
                    <input
                      type="number"
                      value={webhookForm.max_retries}
                      onChange={(e) => setWebhookForm({ ...webhookForm, max_retries: parseInt(e.target.value) })}
                      className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bekleme (saniye)</label>
                    <input
                      type="number"
                      value={webhookForm.retry_delay_seconds}
                      onChange={(e) => setWebhookForm({ ...webhookForm, retry_delay_seconds: parseInt(e.target.value) })}
                      className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowWebhookModal(false)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={webhookForm.events.length === 0}
                    className="px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Webhook Ekle
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowLogsModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Webhook Logları</h3>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh]">
                {webhookLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Henüz log kaydı yok
                  </div>
                ) : (
                  <div className="space-y-2">
                    {webhookLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`border rounded-lg p-3 ${
                          log.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${log.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-sm font-medium">{log.event_type}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                          }`}>
                            {log.success ? `✓ ${log.response_status}` : `✗ ${log.error_message || log.response_status}`}
                          </span>
                          {log.retry_count > 0 && (
                            <span className="ml-2 text-xs text-gray-500">
                              {log.retry_count} yeniden deneme
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiManagement;
