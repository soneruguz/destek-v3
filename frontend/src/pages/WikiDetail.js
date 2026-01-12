import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useToast } from '../contexts/ToastContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { quillModules, quillFormats } from '../utils/quillConfig';

const WikiDetail = () => {
  const { id } = useParams();
  const [wiki, setWiki] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [sharedDepartments, setSharedDepartments] = useState([]);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchSharedEntities = useCallback(async () => {
    try {
      const [sharedUsersRes, sharedDeptsRes] = await Promise.all([
        axiosInstance.get(`/wikis/${id}/shared_users`),
        axiosInstance.get(`/wikis/${id}/shared_departments`)
      ]);

      setSharedUsers(sharedUsersRes.data || []);
      setSharedDepartments(sharedDeptsRes.data || []);
    } catch (err) {
      console.error('Error fetching shared entities:', err);
    }
  }, [id]);

  useEffect(() => {
    const fetchWiki = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/wikis/${id}`);
        setWiki(response.data);
        if (response.data.revisions && response.data.revisions.length > 0) {
          setContent(response.data.revisions[0].content);
        }

        fetchSharedEntities();
      } catch (err) {
        console.error('Error fetching wiki details:', err);
        setError('Wiki detayları yüklenirken bir hata oluştu.');
        addToast('Wiki detayları yüklenirken bir hata oluştu.', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchWiki();
    }
  }, [id, addToast, fetchSharedEntities]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await axiosInstance.get('/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      addToast('Kullanıcılar yüklenirken bir hata oluştu.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [addToast]);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoadingDepartments(true);
      const response = await axiosInstance.get('/departments/');
      setDepartments(response.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
      addToast('Departmanlar yüklenirken bir hata oluştu.', 'error');
    } finally {
      setLoadingDepartments(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (showShareModal) {
      fetchUsers();
      fetchDepartments();
    }
  }, [showShareModal, fetchUsers, fetchDepartments]);

  useEffect(() => {
    if (showShareModal) {
      const userIds = sharedUsers.map(user => user.id);
      const deptIds = sharedDepartments.map(dept => dept.id);

      setSelectedUsers(userIds);
      setSelectedDepartments(deptIds);
    }
  }, [showShareModal, sharedUsers, sharedDepartments]);

  const handleSaveRevision = async () => {
    if (!content.trim()) {
      addToast('İçerik boş olamaz', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await axiosInstance.post(`/wikis/${id}/revisions`, {
        content
      });
      addToast('Revizyon başarıyla kaydedildi', 'success');
      setEditMode(false);

      const response = await axiosInstance.get(`/wikis/${id}`);
      setWiki(response.data);
    } catch (err) {
      console.error('Error saving revision:', err);
      addToast('Revizyon kaydedilirken bir hata oluştu', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bu wiki\'yi silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await axiosInstance.delete(`/wikis/${id}`);
      addToast('Wiki başarıyla silindi', 'success');
      navigate('/wikis');
    } catch (err) {
      console.error('Error deleting wiki:', err);
      addToast('Wiki silinirken bir hata oluştu', 'error');
    }
  };

  const handleShare = async () => {
    try {
      setIsSubmitting(true);
      await axiosInstance.post(`/wikis/${id}/share`, {
        user_ids: selectedUsers,
        department_ids: selectedDepartments
      });
      addToast('Wiki başarıyla paylaşıldı', 'success');
      setShowShareModal(false);

      fetchSharedEntities();
    } catch (err) {
      console.error('Error sharing wiki:', err);
      addToast('Wiki paylaşılırken bir hata oluştu', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserSelect = (e) => {
    const userId = parseInt(e.target.value);
    if (e.target.checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleDepartmentSelect = (e) => {
    const deptId = parseInt(e.target.value);
    if (e.target.checked) {
      setSelectedDepartments([...selectedDepartments, deptId]);
    } else {
      setSelectedDepartments(selectedDepartments.filter(id => id !== deptId));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!wiki) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        Wiki bulunamadı.
      </div>
    );
  }

  const latestRevision = wiki.revisions && wiki.revisions.length > 0 ? wiki.revisions[0] : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{wiki.title}</h1>
          <p className="text-sm text-gray-500">
            {wiki.is_private ? 'Gizli' : 'Açık'} wiki - Son güncelleme: {new Date(wiki.updated_at || wiki.created_at).toLocaleString('tr-TR')}
          </p>
        </div>
        <div className="flex space-x-2">
          {!editMode && (
            <>
              <button
                onClick={() => setShowShareModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Paylaş
              </button>
              <button
                onClick={() => setEditMode(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Düzenle
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Sil
              </button>
            </>
          )}
          {editMode && (
            <>
              <button
                onClick={handleSaveRevision}
                disabled={isSubmitting}
                className={`${
                  isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                } text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500`}
              >
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                disabled={isSubmitting}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                İptal
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg p-4">
        {editMode ? (
          <div className="quill-container" style={{ height: '500px' }}>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={quillModules}
              formats={quillFormats}
              style={{ height: '450px' }}
            />
          </div>
        ) : (
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: latestRevision?.content || '' }}></div>
        )}
      </div>

      {wiki.revisions && wiki.revisions.length > 1 && !editMode && (
        <div className="bg-white shadow sm:rounded-lg p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Revizyon Geçmişi</h2>
          <div className="divide-y divide-gray-200">
            {wiki.revisions.slice(1).map((revision, index) => (
              <div key={revision.id} className="py-4">
                <div className="flex justify-between">
                  <p className="text-sm text-gray-500">
                    Revizyon #{wiki.revisions.length - 1 - index} - {new Date(revision.created_at).toLocaleString('tr-TR')}
                  </p>
                  <button
                    onClick={() => {
                      setContent(revision.content);
                      setEditMode(true);
                    }}
                    className="text-primary-600 hover:text-primary-900 text-sm"
                  >
                    Bu revizyonu düzenle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!editMode && (
        <div className="bg-white shadow sm:rounded-lg p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Paylaşılan Kişiler ve Departmanlar</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-medium text-gray-700">Kişiler</h3>
              {sharedUsers.length > 0 ? (
                <ul className="list-disc pl-5">
                  {sharedUsers.map(user => (
                    <li key={user.id} className="text-sm text-gray-600">
                      {user.full_name} ({user.username})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Bu wiki herhangi bir kişiyle paylaşılmamış.</p>
              )}
            </div>
            <div>
              <h3 className="text-md font-medium text-gray-700">Departmanlar</h3>
              {sharedDepartments.length > 0 ? (
                <ul className="list-disc pl-5">
                  {sharedDepartments.map(dept => (
                    <li key={dept.id} className="text-sm text-gray-600">
                      {dept.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Bu wiki herhangi bir departmanla paylaşılmamış.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Wiki Paylaşımı</h2>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Bu wiki'yi kişi veya departmanlarla paylaşabilirsiniz. Seçtiğiniz kişi ve departmanlar bu wiki'ye erişim sağlayabilecek.
              </p>

              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Departmanlar</h3>
                {loadingDepartments ? (
                  <div className="flex justify-center">
                    <div className="animate-spin h-5 w-5 border-t-2 border-blue-500 rounded-full"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {departments.map(dept => (
                      <div key={dept.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`dept-${dept.id}`}
                          value={dept.id}
                          checked={selectedDepartments.includes(dept.id)}
                          onChange={handleDepartmentSelect}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`dept-${dept.id}`} className="ml-2 text-sm text-gray-700">
                          {dept.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Kullanıcılar</h3>
                {loadingUsers ? (
                  <div className="flex justify-center">
                    <div className="animate-spin h-5 w-5 border-t-2 border-blue-500 rounded-full"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          value={user.id}
                          checked={selectedUsers.includes(user.id)}
                          onChange={handleUserSelect}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`user-${user.id}`} className="ml-2 text-sm text-gray-700">
                          {user.full_name} ({user.username})
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
              >
                İptal
              </button>
              <button
                onClick={handleShare}
                disabled={isSubmitting}
                className={`px-4 py-2 ${
                  isSubmitting ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'
                } text-white rounded-md`}
              >
                {isSubmitting ? 'Paylaşılıyor...' : 'Paylaş'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WikiDetail;