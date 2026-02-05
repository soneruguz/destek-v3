import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../config/api';

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  
  // Filtre state'leri
  const [category, setCategory] = useState('');
  const [action, setAction] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Cleanup modal
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [daysToKeep, setDaysToKeep] = useState(90);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (action) params.append('action', action);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (startDate) params.append('start_date', new Date(startDate).toISOString());
      if (endDate) params.append('end_date', new Date(endDate).toISOString());
      params.append('page', page);
      params.append('page_size', pageSize);

      const response = await axiosInstance.get(`system-logs/?${params.toString()}`);
      setLogs(response.data.logs);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Loglar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [category, action, status, search, startDate, endDate, page, pageSize]);

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('system-logs/stats');
      setStats(response.data);
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await axiosInstance.get('system-logs/categories');
      setFilters(response.data);
    } catch (error) {
      console.error('Filtreler yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
    fetchFilters();
  }, []);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('compress', 'true');
      if (category) params.append('category', category);
      if (startDate) params.append('start_date', new Date(startDate).toISOString());
      if (endDate) params.append('end_date', new Date(endDate).toISOString());

      const response = await axiosInstance.get(`system-logs/export?${params.toString()}`, {
        responseType: 'blob'
      });

      // Dosyayı indir
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `system_logs_${new Date().toISOString().split('T')[0]}.${format}.gz`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export hatası:', error);
      alert('Loglar export edilirken hata oluştu');
    } finally {
      setExporting(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const response = await axiosInstance.delete(`system-logs/cleanup?days_to_keep=${daysToKeep}&export_before_delete=true`);
      alert(`${response.data.deleted_count} log kaydı silindi`);
      setShowCleanupModal(false);
      fetchLogs();
      fetchStats();
    } catch (error) {
      console.error('Cleanup hatası:', error);
      alert('Loglar temizlenirken hata oluştu');
    } finally {
      setCleaning(false);
    }
  };

  const getCategoryBadge = (cat) => {
    const colors = {
      auth: 'bg-blue-100 text-blue-800',
      ticket: 'bg-purple-100 text-purple-800',
      mail: 'bg-green-100 text-green-800',
      user: 'bg-yellow-100 text-yellow-800',
      department: 'bg-orange-100 text-orange-800',
      wiki: 'bg-pink-100 text-pink-800',
      system: 'bg-gray-100 text-gray-800',
      notification: 'bg-indigo-100 text-indigo-800',
      file: 'bg-cyan-100 text-cyan-800'
    };
    return colors[cat] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (st) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800'
    };
    return colors[st] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      auth: 'Kimlik Doğrulama',
      ticket: 'Talepler',
      mail: 'E-posta',
      user: 'Kullanıcılar',
      department: 'Departmanlar',
      wiki: 'Bilgi Bankası',
      system: 'Sistem',
      notification: 'Bildirimler',
      file: 'Dosyalar'
    };
    return labels[cat] || cat;
  };

  const getActionLabel = (act) => {
    const labels = {
      login: 'Giriş',
      logout: 'Çıkış',
      login_failed: 'Başarısız Giriş',
      create: 'Oluşturma',
      update: 'Güncelleme',
      delete: 'Silme',
      send: 'Gönderim',
      send_failed: 'Başarısız Gönderim',
      rejected: 'Reddedildi',
      upload: 'Yükleme',
      download: 'İndirme',
      export: 'Dışa Aktarma',
      comment: 'Yorum',
      cleanup: 'Temizlik'
    };
    return labels[act] || act;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('tr-TR');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🔍 Sistem Logları</h1>
        <p className="text-gray-600">Sistemdeki tüm işlemlerin kayıtları</p>
      </div>

      {/* İstatistik Kartları */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Toplam Log</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_logs.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Bugün</div>
            <div className="text-2xl font-bold text-blue-600">{stats.today_count.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Son 7 Gün</div>
            <div className="text-2xl font-bold text-green-600">{stats.last_7_days_count.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Başarısız</div>
            <div className="text-2xl font-bold text-red-600">{stats.statuses?.failed || 0}</div>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Tümü</option>
              {filters?.categories?.map(cat => (
                <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aksiyon</label>
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Tümü</option>
              {filters?.actions?.map(act => (
                <option key={act} value={act}>{getActionLabel(act)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Tümü</option>
              <option value="success">Başarılı</option>
              <option value="failed">Başarısız</option>
              <option value="warning">Uyarı</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchLogs()}
              placeholder="Kullanıcı, hedef..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCategory('');
                setAction('');
                setStatus('');
                setSearch('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Filtreleri Temizle
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? '...' : '📥 JSON Export'}
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? '...' : '📥 CSV Export'}
            </button>
            <button
              onClick={() => setShowCleanupModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              🗑️ Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Log Tablosu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksiyon</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hedef</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detay</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Log kaydı bulunamadı
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadge(log.category)}`}>
                        {getCategoryLabel(log.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getActionLabel(log.action)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.username || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.target_name ? (
                        <span title={`${log.target_type}: ${log.target_id}`}>
                          {log.target_name.length > 30 ? log.target_name.substring(0, 30) + '...' : log.target_name}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(log.status)}`}>
                        {log.status === 'success' ? '✓' : log.status === 'failed' ? '✗' : '⚠'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.error_message ? (
                        <span className="text-red-600" title={log.error_message}>
                          {log.error_message.length > 40 ? log.error_message.substring(0, 40) + '...' : log.error_message}
                        </span>
                      ) : log.details ? (
                        <span title={JSON.stringify(log.details, null, 2)}>
                          {JSON.stringify(log.details).substring(0, 40)}...
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Sayfalama */}
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Toplam <span className="font-medium">{total}</span> kayıt
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
            >
              Önceki
            </button>
            <span className="px-3 py-1 text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Cleanup Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🗑️ Log Temizleme</h3>
            <p className="text-gray-600 mb-4">
              Belirtilen günden önceki loglar silinecektir. Silmeden önce otomatik olarak export alınacaktır.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Son kaç günün loglarını tut?
              </label>
              <input
                type="number"
                min="7"
                max="365"
                value={daysToKeep}
                onChange={(e) => setDaysToKeep(parseInt(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {daysToKeep} günden eski loglar silinecek
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCleanupModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                İptal
              </button>
              <button
                onClick={handleCleanup}
                disabled={cleaning}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {cleaning ? 'Temizleniyor...' : 'Temizle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
