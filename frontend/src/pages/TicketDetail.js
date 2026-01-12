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

  useEffect(() => {
    const fetchTicketData = async () => {
      setLoading(true);
      try {
        const [ticketRes, commentsRes, usersRes, deptsRes, configRes] = await Promise.all([
          axiosInstance.get(`/tickets/${id}`),
          axiosInstance.get(`/tickets/${id}/comments/`),
          axiosInstance.get('/users/?active_only=true'),  // Sadece aktif kullanıcılar
          axiosInstance.get('/departments/'),
          axiosInstance.get('/settings/').catch(() => ({ data: { general: { max_file_size_mb: 10 } } }))
        ]);
        
        setTicket(ticketRes.data);
        setComments(commentsRes.data || []);
        setUsers(usersRes.data);
        setDepartments(deptsRes.data);
        setSystemConfig(configRes.data?.general || { max_file_size_mb: 10 });
        
        // Dosya eklerini de getir
        try {
          const attachmentsRes = await axiosInstance.get(`/tickets/${id}/attachments/`);
          setAttachments(attachmentsRes.data || []);
        } catch (err) {
          setAttachments([]);
        }
        
        try {
          const [sharedUsersRes, sharedDeptsRes] = await Promise.all([
            axiosInstance.get(`/tickets/${id}/shared_users/`),
            axiosInstance.get(`/tickets/${id}/shared_departments/`)
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
      const response = await axiosInstance.put(`/tickets/${id}`, { status: newStatus });
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
      const response = await axiosInstance.post(`/tickets/${id}/comments/`, {
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
      
      const response = await axiosInstance.put(`/tickets/${id}`, { 
        assignee_id: assigneeId 
      });
      
      setTicket(response.data);
      addToast('Atanan kişi başarıyla güncellendi', 'success');
    } catch (err) {
      console.error('Error updating assignee:', err);
      addToast('Atanan kişi güncellenirken bir hata oluştu', 'error');
    }
  };

  const handleShareSubmit = async () => {
    try {
      await axiosInstance.post(`/tickets/${id}/share`, shareData);
      
      const [sharedUsersRes, sharedDeptsRes] = await Promise.all([
        axiosInstance.get(`/tickets/${id}/shared_users`),
        axiosInstance.get(`/tickets/${id}/shared_departments`)
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
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
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
                                  const attachmentsRes = await axiosInstance.get(`/tickets/${id}/attachments/`);
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
              
              {/* Basit dosya listesi */}
              <div className="space-y-3">
                {attachments.length > 0 ? 
                  attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-primary-400 transition-colors">
                      <div className="flex items-center space-x-4 flex-1">
                        {/* ÖN İZLEME ALANI */}
                        {file.preview_url ? (
                          <div className="relative group">
                            <img 
                              src={`${API_URL}${file.preview_url}`} 
                              alt={file.filename}
                              className="h-20 w-20 object-cover rounded-md cursor-pointer hover:shadow-xl hover:scale-110 transition-all duration-200 border-2 border-primary-200"
                              onClick={() => {
                                setSelectedImage(file);
                                setShowImageModal(true);
                              }}
                              onError={(e) => {
                                console.error('Resim yüklenemedi:', `${API_URL}${file.preview_url}`, e);
                                e.target.style.display = 'none';
                              }}
                              onLoad={() => {}}
                              title="Büyütmek için tıklayın"
                            />
                            <div className="absolute -top-8 left-0 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Ön İZLEME VAR!
                            </div>
                          </div>
                        ) : (
                          <div className="h-20 w-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-md flex items-center justify-center border-2 border-blue-200">
                            <div className="text-xs text-center text-red-600">NO PREVIEW</div>
                            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">{file.filename}</div>
                          <div className="text-xs text-gray-500 mt-1">{file.size_formatted} • {file.uploaded_at}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => window.open(`${API_URL}${file.download_url}`, '_blank')}
                          className="text-sm text-primary-600 hover:text-primary-800"
                        >
                          İndir
                        </button>
                      </div>
                    </div>
                  ))
                  : 
                  <p className="text-gray-500 text-center py-4">Henüz dosya eklenmemiş</p>
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
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ticket.priority === 'low' ? 'bg-green-100 text-green-800' :
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
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ticket.is_personal 
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
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ticket.is_private 
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
                          const response = await axiosInstance.put(`/tickets/${id}`, {
                            is_private: !ticket.is_private
                          });
                          setTicket(response.data);
                          addToast(`Talep ${ticket.is_private ? 'herkese açık' : 'gizli'} olarak güncellendi`, 'success');
                        } catch (err) {
                          console.error('Error updating privacy:', err);
                          addToast('Gizlilik durumu güncellenirken bir hata oluştu', 'error');
                        }
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        ticket.is_private 
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

      {/* Image Modal / Lightbox */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="relative max-w-4xl max-h-screen flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Kapatma Butonu */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-0 right-0 -mt-12 text-white hover:text-gray-300 transition-colors text-3xl font-bold"
              title="Kapat (ESC)"
            >
              ×
            </button>

            {/* Görsel */}
            <img 
              src={`${API_URL}${selectedImage.preview_url}`} 
              alt={selectedImage.filename}
              className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl"
            />

            {/* Alt Bilgiler */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
              <div className="text-sm font-medium">{selectedImage.filename}</div>
              <div className="text-xs text-gray-300">{selectedImage.size_formatted} • {selectedImage.uploaded_at}</div>
            </div>
          </div>

          {/* ESC tuşu ile kapatma */}
          {typeof window !== 'undefined' && window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && showImageModal) {
              setShowImageModal(false);
            }
          })}
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
