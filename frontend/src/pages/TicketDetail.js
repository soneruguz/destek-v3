import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import 'react-quill/dist/quill.snow.css';
import Select from 'react-select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/apiConfig';

const TicketDetail = () => {
  const { id } = useParams();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [sharedDepartments, setSharedDepartments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [systemConfig, setSystemConfig] = useState({ max_file_size_mb: 10 });
  const [showFileUpload, setShowFileUpload] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({
    user_ids: [],
    department_ids: []
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Global paste event listener - sayfada Ctrl+V ile ekran görüntüsü yapıştırıp dosya olarak yükleme
  useEffect(() => {
    const handleGlobalPaste = async (e) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData || !clipboardData.items) return;

      const imageItems = Array.from(clipboardData.items).filter(item => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      e.preventDefault();
      for (const item of imageItems) {
        const blob = item.getAsFile();
        if (!blob) continue;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const ext = blob.type.split('/')[1] || 'png';
        const fileName = `ekran_goruntusu_${timestamp}.${ext}`;

        const formData = new FormData();
        formData.append('file', blob, fileName);

        try {
          await axiosInstance.post(`/tickets/${id}/attachments/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          addToast(`Ekran görüntüsü yüklendi: ${fileName}`, 'success');
          // Dosya listesini yenile
          const attachmentsRes = await axiosInstance.get(`tickets/${id}/attachments/`);
          setAttachments(attachmentsRes.data || []);
        } catch (err) {
          console.error('Ekran görüntüsü yükleme hatası:', err);
          addToast('Ekran görüntüsü yüklenirken hata oluştu', 'error');
        }
      }
    };
    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [id, addToast]);

  useEffect(() => {
    const fetchTicketData = async () => {
      setLoading(true);
      try {
        const [ticketRes, commentsRes, usersRes, deptsRes, configRes] = await Promise.all([
          axiosInstance.get(`tickets/${id}/`),
          axiosInstance.get(`tickets/${id}/comments/`),
          axiosInstance.get('users/?active_only=true'),  // Sadece aktif kullanıcılar
          axiosInstance.get('departments/'),
          axiosInstance.get('settings/public/config/').catch(() => ({ data: { general: { max_file_size_mb: 10 } } }))
        ]);

        setTicket(ticketRes.data);
        setComments(commentsRes.data || []);
        setUsers(usersRes.data);
        setDepartments(deptsRes.data);
        setSystemConfig(configRes.data?.general || { max_file_size_mb: 10 });

        // Dosya eklerini de getir
        try {
          const attachmentsRes = await axiosInstance.get(`tickets/${id}/attachments/`);
          setAttachments(attachmentsRes.data || []);
        } catch (err) {
          setAttachments([]);
        }

        try {
          const [sharedUsersRes, sharedDeptsRes] = await Promise.all([
            axiosInstance.get(`tickets/${id}/shared_users/`),
            axiosInstance.get(`tickets/${id}/shared_departments/`)
          ]);

          setSharedUsers(sharedUsersRes.data || []);
          setSharedDepartments(sharedDeptsRes.data || []);
        } catch (err) {
          console.error('Error fetching shared entities:', err);
          setSharedUsers([]);
          setSharedDepartments([]);
        }
      } catch (err) {
        console.error('Error fetching ticket data:', err);
        setError('Talep verileri yüklenirken bir hata oluştu.');
        addToast('Talep verileri yüklenirken bir hata oluştu', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [id, addToast]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      const response = await axiosInstance.put(`tickets/${id}/`, { status: newStatus });
      setTicket(response.data);
      addToast('Talep durumu başarıyla güncellendi', 'success');
    } catch (err) {
      const backendMsg = err.response?.data?.detail;
      const msg = typeof backendMsg === 'string'
        ? backendMsg
        : Array.isArray(backendMsg)
          ? backendMsg.map((x) => x.msg || x.detail).filter(Boolean).join(' ')
          : 'Durum güncellenirken bir hata oluştu';
      addToast(msg, 'error');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await axiosInstance.post(`tickets/${id}/comments/`, {
        content: commentText
      });

      setComments([...comments, response.data]);
      setCommentText('');
      addToast('Yorum başarıyla eklendi', 'success');
    } catch (err) {
      const backendMsg = err.response?.data?.detail;
      const msg = typeof backendMsg === 'string'
        ? backendMsg
        : Array.isArray(backendMsg)
          ? backendMsg.map((x) => x.msg || x.detail).filter(Boolean).join(' ')
          : 'Yorum eklenirken bir hata oluştu';
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssigneeChange = async (userId) => {
    try {
      const assigneeId = userId === "" ? null : parseInt(userId);

      const response = await axiosInstance.put(`tickets/${id}/`, {
        assignee_id: assigneeId
      });

      setTicket(response.data);
      addToast('Atanan kişi başarıyla güncellendi', 'success');
    } catch (err) {
      console.error('Error updating assignee:', err);
      addToast('Atanan kişi güncellenirken bir hata oluştu', 'error');
    }
  };

  const handleDepartmentChange = async (deptId) => {
    try {
      const departmentId = deptId === "" ? null : parseInt(deptId);

      const response = await axiosInstance.put(`tickets/${id}/`, {
        department_id: departmentId
      });

      setTicket(response.data);
      addToast('Birim başarıyla güncellendi', 'success');
    } catch (err) {
      console.error('Error updating department:', err);
      addToast('Birim güncellenirken bir hata oluştu', 'error');
    }
  };

  const handleShareSubmit = async () => {
    try {
      await axiosInstance.post(`tickets/${id}/share/`, shareData);

      const [sharedUsersRes, sharedDeptsRes] = await Promise.all([
        axiosInstance.get(`tickets/${id}/shared_users/`),
        axiosInstance.get(`tickets/${id}/shared_departments/`)
      ]);

      setSharedUsers(sharedUsersRes.data || []);
      setSharedDepartments(sharedDeptsRes.data || []);

      setShowShareModal(false);
      addToast('Talep başarıyla paylaşıldı', 'success');
    } catch (err) {
      console.error('Error sharing ticket:', err);
      addToast('Talep paylaşılırken bir hata oluştu', 'error');
    }
  };

  const handleAttachmentDownload = async (file) => {
    try {
      const token = localStorage.getItem('token');
      const downloadPath = file.download_url?.replace(/^\/api\//, '') || `tickets/${id}/attachments/${file.id}/download`;
      const separator = downloadPath.includes('?') ? '&' : '?';
      const response = await axiosInstance.get(`${downloadPath}${separator}token=${encodeURIComponent(token)}`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', file.filename || `ticket_${id}_attachment`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Dosya indirme hatası:', err);
      let msg = 'Dosya indirilirken bir hata oluştu';
      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.detail) msg = json.detail;
        } else if (err.response?.data?.detail) {
          msg = err.response.data.detail;
        }
      } catch (parseErr) { /* JSON parse hatası - varsayılan mesaj kullanılacak */ }
      addToast(msg, 'error');
    }
  };

  // Bu fonksiyonları tamamen kaldır - artık kullanılmıyor
  // const handleFileUploaded = (fileData) => {
  //   // Bu fonksiyon artık kullanılmıyor
  // };

  // const handleFileDeleted = (fileId) => {
  //   // Bu fonksiyon artık kullanılmıyor
  // };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-xl text-red-600 mb-4">{error || 'Talep bulunamadı'}</div>
        <Link to="/tickets" className="btn btn-primary">
          Talep Listesine Dön
        </Link>
      </div>
    );
  }

  const userOptions = users.map(u => ({
    value: u.id,
    label: `${u.full_name} (${u.username})`
  }));

  const departmentOptions = departments.map(dept => ({
    value: dept.id,
    label: dept.name
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Talep #{ticket.id}: {ticket.title}
        </h1>
        <div className="flex space-x-2">
          {!ticket.is_private && (
            <button
              onClick={() => setShowShareModal(true)}
              className="btn btn-secondary"
            >
              Paylaş
            </button>
          )}
          <Link to="/tickets" className="btn btn-white">
            Talep Listesine Dön
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Talep Detayları</h3>
                <div className="flex items-center space-x-2">
                  {ticket.is_private && (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Gizli Talep
                    </span>
                  )}
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                    ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {ticket.status === 'open' ? 'Açık' :
                      ticket.status === 'in_progress' ? 'İşlemde' : 'Kapalı'}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: ticket.description }}></div>
            </div>

            {/* Dosya Ekleri */}
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Dosya Ekleri</h3>
                <button
                  type="button"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {showFileUpload ? 'Gizle' : 'Dosya Ekle'}
                </button>
              </div>

              {showFileUpload && (
                <div className="mb-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Dosya seçmek için tıklayın veya buraya sürükleyin
                          </span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            multiple
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);

                              for (const file of files) {
                                const formData = new FormData();
                                formData.append('file', file);

                                try {
                                  const response = await axiosInstance.post(
                                    `/tickets/${id}/attachments/`,
                                    formData,
                                    {
                                      headers: {
                                        'Content-Type': 'multipart/form-data'
                                      }
                                    }
                                  );

                                  addToast(`${file.name} başarıyla yüklendi`, 'success');

                                  // Dosya listesini yenile
                                  const attachmentsRes = await axiosInstance.get(`tickets/${id}/attachments/`);
                                  setAttachments(attachmentsRes.data || []);

                                } catch (error) {
                                  console.error('Dosya yükleme hatası:', error);
                                  addToast(`${file.name} yüklenirken hata oluştu`, 'error');
                                }
                              }

                              // Input'u temizle
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          PNG, JPG, PDF dosyaları desteklenir (Max {systemConfig.max_file_size_mb || 10}MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dosya ekleri grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {attachments.length > 0 ?
                  attachments.map((file) => (
                    <div key={file.id} className="group relative rounded-lg border border-gray-200 hover:border-primary-400 hover:shadow-md transition-all overflow-hidden bg-white">
                      {/* Önizleme / İkon */}
                      <div
                        className="aspect-square flex items-center justify-center cursor-pointer bg-gray-50 overflow-hidden"
                        onClick={() => {
                          if (file.preview_url) {
                            setSelectedImage(file);
                            setImageZoom(1);
                            setImagePan({ x: 0, y: 0 });
                            setShowImageModal(true);
                          }
                        }}
                        title={file.preview_url ? 'Büyütmek için tıklayın' : file.filename}
                      >
                        {file.preview_url ? (
                          <img
                            src={`${API_URL}${file.preview_url}`}
                            alt={file.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xs mt-1 px-2 text-center truncate w-full">{file.filename}</span>
                          </div>
                        )}
                      </div>
                      {/* İndir butonu - hover'da görünen overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center py-1.5 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAttachmentDownload(file); }}
                          className="text-xs text-white bg-primary-600 hover:bg-primary-700 px-3 py-1 rounded-full shadow"
                        >
                          ⬇ İndir
                        </button>
                      </div>
                    </div>
                  ))
                  :
                  <p className="col-span-full text-gray-500 text-center py-4">Henüz dosya eklenmemiş</p>
                }
              </div>
            </div>

            {(ticket.teos_id || ticket.citizenship_no) && (
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Ek Bilgiler</h4>
                <div className="grid grid-cols-2 gap-4">
                  {ticket.teos_id && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Teos ID</dt>
                      <dd className="mt-1 text-sm text-gray-900">{ticket.teos_id}</dd>
                    </div>
                  )}
                  {ticket.citizenship_no && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Vatandaşlık No</dt>
                      <dd className="mt-1 text-sm text-gray-900">{ticket.citizenship_no}</dd>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Yorumlar</h3>
            </div>
            <div className="border-t border-gray-200 divide-y divide-gray-200">
              {comments.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {comments.map(comment => (
                    <li key={comment.id} className="px-4 py-5 sm:px-6">
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white">
                            {comment.user?.full_name?.charAt(0) || 'U'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.user?.full_name || 'Bilinmeyen Kullanıcı'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                          <div className="mt-2 text-sm text-gray-700">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                  Henüz yorum yok
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Yeni Yorum Ekle</h4>
              <form onSubmit={handleCommentSubmit}>
                <div className="form-group">
                  <textarea
                    id="commentText"
                    name="commentText"
                    rows="3"
                    className="shadow-sm block w-full focus:ring-primary-500 focus:border-primary-500 sm:text-sm border border-gray-300 rounded-md"
                    placeholder="Yorumunuzu buraya yazın..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    required
                  ></textarea>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'Yorum Ekle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Talep Bilgileri</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Oluşturan</dt>
                  <dd className="mt-1 text-sm text-gray-900">{ticket.creator?.full_name || 'Bilinmeyen'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Departman</dt>
                  <dd className="mt-1 text-sm text-gray-900">{ticket.department?.name || 'Bilinmeyen'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Öncelik</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' :
                      ticket.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                        ticket.priority === 'high' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                      {ticket.priority === 'low' ? 'Düşük' :
                        ticket.priority === 'medium' ? 'Orta' :
                          ticket.priority === 'high' ? 'Yüksek' : 'Kritik'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Oluşturulma</dt>
                  <dd className="mt-1 text-sm text-gray-900">{new Date(ticket.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Son Güncelleme</dt>
                  <dd className="mt-1 text-sm text-gray-900">{ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'Güncellenmedi'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Birim</dt>
                  <dd className="mt-1">
                    <select
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                      value={ticket.department_id || ''}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                    >
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Atanan Kişi</dt>
                  <dd className="mt-1">
                    <select
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                      value={ticket.assignee_id || ''}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                    >
                      <option value="">Atanmamış</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Talep Türü</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.is_personal
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                      }`}>
                      {ticket.is_personal ? 'Kişisel Talep' : 'Departman Talebi'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Gizlilik Durumu</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.is_private
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                      }`}>
                      {ticket.is_private ? 'Özel Talep' : 'Genel Talep'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Durum Değiştir</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="flex flex-col space-y-3">
                {ticket.status !== 'open' && (
                  <button
                    onClick={() => handleStatusUpdate('open')}
                    className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Açık Olarak İşaretle
                  </button>
                )}
                {ticket.status !== 'in_progress' && (
                  <button
                    onClick={() => handleStatusUpdate('in_progress')}
                    className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    İşlemde Olarak İşaretle
                  </button>
                )}
                {ticket.status !== 'closed' && (
                  <button
                    onClick={() => handleStatusUpdate('closed')}
                    className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Kapalı Olarak İşaretle
                  </button>
                )}
              </div>
              {/* Gizlilik Durumu */}
              {(ticket.creator_id === user.id || user.is_admin) && ( // Sadece oluşturucu veya admin değiştirebilir
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Gizlilik Durumu:</span>
                    <button
                      onClick={async () => {
                        try {
                          const response = await axiosInstance.put(`tickets/${id}/`, {
                            is_private: !ticket.is_private
                          });
                          setTicket(response.data);
                          addToast(`Talep ${ticket.is_private ? 'herkese açık' : 'gizli'} olarak güncellendi`, 'success');
                        } catch (err) {
                          console.error('Error updating privacy:', err);
                          addToast('Gizlilik durumu güncellenirken bir hata oluştu', 'error');
                        }
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${ticket.is_private
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                    >
                      {ticket.is_private ? 'Gizli' : 'Herkese Açık'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {ticket.is_private
                      ? 'Bu talep sadece siz, atanan kişi ve yöneticiler tarafından görüntülenebilir.'
                      : 'Bu talep ilgili departmanlar ve paylaşılan kişiler tarafından görüntülenebilir.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Paylaşım Bilgileri</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Paylaşılan Kullanıcılar</h4>
                  {sharedUsers.length > 0 ? (
                    <ul className="mt-2 divide-y divide-gray-200">
                      {sharedUsers.map(sharedUser => (
                        <li key={sharedUser.id} className="py-2">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                                {sharedUser.full_name.charAt(0)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {sharedUser.full_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {sharedUser.email}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">Henüz kullanıcı paylaşımı yok</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Paylaşılan Departmanlar</h4>
                  {sharedDepartments.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sharedDepartments.map(dept => (
                        <span key={dept.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {dept.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">Henüz departman paylaşımı yok</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showShareModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Talebi Paylaş
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kullanıcılarla Paylaş
                        </label>
                        <Select
                          isMulti
                          options={userOptions}
                          className="basic-multi-select"
                          classNamePrefix="select"
                          placeholder="Kullanıcı seçin..."
                          onChange={(selected) => setShareData(prev => ({
                            ...prev,
                            user_ids: selected ? selected.map(item => item.value) : []
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Departmanlarla Paylaş
                        </label>
                        <Select
                          isMulti
                          options={departmentOptions}
                          className="basic-multi-select"
                          classNamePrefix="select"
                          placeholder="Departman seçin..."
                          onChange={(selected) => setShareData(prev => ({
                            ...prev,
                            department_ids: selected ? selected.map(item => item.value) : []
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleShareSubmit}
                >
                  Paylaş
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowShareModal(false)}
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal / Lightbox - Zoomable */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-85 flex items-center justify-center"
          onClick={() => { setShowImageModal(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
          onWheel={(e) => {
            e.preventDefault();
            setImageZoom(prev => {
              const delta = e.deltaY > 0 ? -0.15 : 0.15;
              const next = Math.max(0.5, Math.min(8, prev + delta));
              if (next <= 1) setImagePan({ x: 0, y: 0 });
              return next;
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setShowImageModal(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }
          }}
          tabIndex={0}
          ref={(el) => el && el.focus()}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: '90vw', height: '90vh' }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              if (imageZoom > 1) {
                setIsDragging(true);
                setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && imageZoom > 1) {
                setImagePan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            {/* Üst toolbar */}
            <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
              <span className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                {Math.round(imageZoom * 100)}%
              </span>
              <button
                onClick={() => setImageZoom(prev => Math.min(8, prev + 0.5))}
                className="text-white bg-black bg-opacity-50 hover:bg-opacity-75 w-8 h-8 rounded-full flex items-center justify-center text-lg"
                title="Yakınlaştır"
              >+</button>
              <button
                onClick={() => { const next = Math.max(0.5, imageZoom - 0.5); setImageZoom(next); if (next <= 1) setImagePan({ x: 0, y: 0 }); }}
                className="text-white bg-black bg-opacity-50 hover:bg-opacity-75 w-8 h-8 rounded-full flex items-center justify-center text-lg"
                title="Uzaklaştır"
              >−</button>
              <button
                onClick={() => { setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                className="text-white bg-black bg-opacity-50 hover:bg-opacity-75 px-2 h-8 rounded-full flex items-center justify-center text-xs"
                title="Sıfırla"
              >Sıfırla</button>
              <button
                onClick={() => { setShowImageModal(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                className="text-white bg-red-600 hover:bg-red-700 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                title="Kapat (ESC)"
              >×</button>
            </div>

            {/* Görsel - zoomable & pannable */}
            <img
              src={`${API_URL}${selectedImage.preview_url}`}
              alt={selectedImage.filename}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
              style={{
                transform: `scale(${imageZoom}) translate(${imagePan.x / imageZoom}px, ${imagePan.y / imageZoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
              }}
              draggable={false}
              onClick={() => {
                if (imageZoom <= 1) {
                  setImageZoom(2);
                }
              }}
              onDoubleClick={() => { setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
            />

            {/* Alt bilgi - sadece zoom %100 iken göster */}
            {imageZoom <= 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
                Scroll: Zoom • Tıkla: Yakınlaştır • Çift tıkla: Sıfırla
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
