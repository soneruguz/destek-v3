import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useToast } from '../contexts/ToastContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const WikiCreate = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_public: true,
    department_id: null,
    category: 'general'
  });

  const [departments, setDepartments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Departmanları yükle
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axiosInstance.get('departments/');
        setDepartments(response.data);
      } catch (err) {
        console.error('Error fetching departments:', err);
        addToast('Departmanlar yüklenirken bir hata oluştu.', 'error');
      }
    };

    fetchDepartments();
  }, [addToast]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      content
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      addToast('Wiki başlığı gereklidir.', 'error');
      return;
    }

    if (!formData.content.trim()) {
      addToast('Wiki içeriği gereklidir.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const submitData = {
        ...formData,
        department_id: formData.department_id === '' ? null : parseInt(formData.department_id)
      };

      await axiosInstance.post('wikis/', submitData);
      
      addToast('Wiki başarıyla oluşturuldu!', 'success');
      navigate('/wikis');
    } catch (err) {
      console.error('Error creating wiki:', err);
      if (err.response?.data?.detail) {
        addToast(err.response.data.detail, 'error');
      } else {
        addToast('Wiki oluşturulurken bir hata oluştu.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Yeni Wiki Oluştur</h1>
        <button
          onClick={() => navigate('/wikis')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Geri Dön
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Başlık *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Wiki başlığını girin"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">Genel</option>
                <option value="technical">Teknik</option>
                <option value="process">Süreç</option>
                <option value="policy">Politika</option>
                <option value="faq">SSS</option>
              </select>
            </div>

            <div>
              <label htmlFor="department_id" className="block text-sm font-medium text-gray-700 mb-2">
                Departman
              </label>
              <select
                id="department_id"
                name="department_id"
                value={formData.department_id || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Departman Seçin (Opsiyonel)</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_public"
                name="is_public"
                checked={formData.is_public}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
                Herkese açık
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            İçerik *
          </label>
          <div className="border border-gray-300 rounded-md">
            <ReactQuill
              value={formData.content}
              onChange={handleContentChange}
              style={{ minHeight: '400px' }}
              placeholder="Wiki içeriğini yazın..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/wikis')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? 'Oluşturuluyor...' : 'Wiki Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WikiCreate;
