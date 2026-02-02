/* eslint-disable no-undef */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Select from 'react-select';
import { useToast } from '../contexts/ToastContext';
import { useDropzone } from 'react-dropzone';

const NewTicket = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [systemConfig, setSystemConfig] = useState({
    enable_teos_id: false,
    enable_citizenship_no: false,
    require_teos_id: false,
    require_citizenship_no: false
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'low',
    department_id: [],
    assignee_id: [],
    is_private: false,
    shared_with_users: [],
    shared_with_departments: [],
    teos_id: '',
    citizenship_no: ''
  });

  // State'leri düzelt - kullanılmayanları kaldır
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [tempFiles, setTempFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showSharingOptions, setShowSharingOptions] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [departmentsRes, usersRes, configRes] = await Promise.all([
          axiosInstance.get('departments/'),
          axiosInstance.get('users/?active_only=true'),  // Sadece aktif kullanıcılar
          axiosInstance.get('settings/public/config/')  // Public endpoint - authentication gerektirmez
        ]);

        setDepartments(departmentsRes.data);
        setUsers(usersRes.data);
        setSystemConfig(configRes.data);

        // Default departmanı ayarla - settings'ten gelmişse onu kullan, yoksa ilk departmanı
        let defaultDeptId = null;
        if (configRes.data.general?.default_department_id) {
          defaultDeptId = configRes.data.general.default_department_id;
        } else if (departmentsRes.data.length > 0) {
          defaultDeptId = departmentsRes.data[0].id;
        }

        if (defaultDeptId) {
          const defaultDept = departmentsRes.data.find(d => d.id === defaultDeptId);
          if (defaultDept) {
            setFormData(prev => ({
              ...prev,
              department_id: [{ value: defaultDept.id, label: defaultDept.name }]
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Başlangıç verileri yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEditorChange = (content) => {
    setFormData(prev => ({ ...prev, description: content }));
  };

  const handlePaste = (e) => {
    if (editorRef.current) {
      const clipboardData = e.clipboardData;
      if (clipboardData && clipboardData.getData) {
        const html = clipboardData.getData('text/html');

        if (html && html.includes('<table')) {
          e.preventDefault();

          const cleanHtml = html
            .replace(/<table/g, '<table style="border-collapse: collapse; width: 100%; margin: 8px 0;"')
            .replace(/<t[dh]/g, '<td style="border: 1px solid #ccc; padding: 8px;"')
            .replace(/<th/g, '<th style="border: 1px solid #ccc; padding: 8px; background-color: #f2f2f2; font-weight: bold;"');

          const quill = editorRef.current.getEditor();
          const range = quill.getSelection();
          const position = range ? range.index : 0;

          quill.clipboard.dangerouslyPasteHTML(position, cleanHtml);
        }
      }
    }
  };

  const handleRemoveFile = (fileName) => {
    setTempFiles(prev => prev.filter(file => file.name !== fileName));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Description'daki boş HTML'leri temizle
    let cleanedDescription = formData.description.trim();
    // Quill'in boş HTML'lerini sil
    cleanedDescription = cleanedDescription.replace(/<p><br><\/p>/g, '');
    cleanedDescription = cleanedDescription.replace(/<p>\s*<\/p>/g, '');
    cleanedDescription = cleanedDescription.replace(/<p>&nbsp;<\/p>/g, '');
    cleanedDescription = cleanedDescription.trim();

    if (!cleanedDescription || cleanedDescription === '') {
      addToast('Açıklama alanı boş bırakılamaz', 'error');
      return;
    }

    if (systemConfig.require_teos_id && !formData.teos_id) {
      addToast('Teos ID alanı zorunludur', 'error');
      return;
    }

    if (systemConfig.require_citizenship_no && !formData.citizenship_no) {
      addToast('Vatandaşlık numarası alanı zorunludur', 'error');
      return;
    }

    // Dosya türü ve boyut kontrolü
    const maxFileSizeMB = systemConfig.max_file_size_mb || 10;
    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

    const allowedExtensions = (systemConfig.allowed_file_types || 'pdf,doc,docx,jpg,jpeg,png')
      .split(',')
      .map(ext => ext.trim().toLowerCase());

    for (const file of tempFiles) {
      // Boyut kontrolü
      if (file.size > maxFileSizeBytes) {
        addToast(`${file.name} dosyası ${maxFileSizeMB}MB'dan büyük olamaz`, 'error');
        setSubmitting(false);
        return;
      }

      // Dosya türü kontrolü
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension && !allowedExtensions.includes(fileExtension)) {
        addToast(`${file.name} dosya türü desteklenmiyor. İzin verilenler: ${allowedExtensions.join(', ')}`, 'error');
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(true);

    try {
      const submitData = {
        ...formData,
        description: cleanedDescription,
        department_id: Array.isArray(formData.department_id)
          ? formData.department_id[0]?.value || formData.department_id[0]
          : formData.department_id,
        assignee_id: Array.isArray(formData.assignee_id)
          ? formData.assignee_id.filter(a => a.value !== 'department').map(a => a.value)[0] || null
          : formData.assignee_id || null,
        shared_with_users: (formData.shared_with_users || []).map(user => user.value),
        shared_with_departments: (formData.shared_with_departments || []).map(dept => dept.value)
      };

      const response = await axiosInstance.post('tickets/', submitData);
      const createdTicketId = response.data.id;

      if (tempFiles.length > 0) {
        setUploadingFiles(true);
        let uploadError = false;

        for (const file of tempFiles) {

          const fileFormData = new FormData();
          fileFormData.append('file', file);

          try {
            const uploadResponse = await axiosInstance.post(
              `/tickets/${createdTicketId}/attachments/`,
              fileFormData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
          } catch (error) {
            console.error(`Dosya yükleme hatası ${file.name}:`, error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            addToast(`${file.name} dosyası yüklenirken hata oluştu`, 'error');
            uploadError = true;

            // Dosya yükleme hatası varsa talebi sil
            try {
              await axiosInstance.delete(`tickets/${createdTicketId}/`);
              addToast('Dosya yükleme başarısız olduğu için talep silinmiştir', 'warning');
            } catch (deleteError) {
              console.error('Talep silinirken hata:', deleteError);
              addToast('Talep oluşturuldu ancak dosyalar yüklenemediler. Lütfen talep silinmesi için admin ile iletişime geçin', 'error');
            }
            break;
          }
        }

        if (uploadError) {
          setUploadingFiles(false);
          setSubmitting(false);
          return;
        }

        setUploadingFiles(false);
      }

      addToast('Destek talebi başarıyla oluşturuldu', 'success');
      navigate(`/tickets/${createdTicketId}`);

    } catch (err) {
      console.error('Error creating ticket:', err);
      setError('Destek talebi oluşturulurken bir hata oluştu.');
      addToast('Destek talebi oluşturulurken bir hata oluştu', 'error');
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const userOptions = users.map(user => ({
    value: user.id,
    label: `${user.full_name} (${user.username})`
  }));

  const departmentOptions = departments.map(dept => ({
    value: dept.id,
    label: dept.name
  }));

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'align', 'color', 'background'
  ];

  // Dropzone'u tamamen basitleştir - sadece onDrop kullan
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles, rejectedFiles) => {
      // Sadece kabul edilen dosyaları ekle
      if (acceptedFiles && acceptedFiles.length > 0) {
        setTempFiles(prev => [...prev, ...acceptedFiles]);
      }
    },
    multiple: true,
    noClick: false,
    noKeyboard: false,
    // Hiçbir accept prop'u kullanma
    disabled: false
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Departman değiştiğinde kullanıcı listesini filtrele - array kontrolü ekle
  const filteredUsers = formData.department_id && Array.isArray(formData.department_id) && formData.department_id.length > 0
    ? users.filter(user => {
      return formData.department_id.some(selectedDept =>
        user.department_id === selectedDept.value
      );
    })
    : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">Yeni Destek Talebi</h1>
      </div>

      <div className="bg-white shadow sm:rounded-lg p-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8 space-y-4">
              <div className="form-group">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Başlık</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Açıklama</label>
                <div className="quill-container" style={{ height: '200px' }}>
                  <ReactQuill
                    ref={editorRef}
                    theme="snow"
                    value={formData.description}
                    onChange={handleEditorChange}
                    onPaste={handlePaste}
                    modules={modules}
                    formats={formats}
                    style={{ height: '170px' }}
                    placeholder="Lütfen talebinizin detaylarını giriniz..."
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Office uygulamalarından içerik kopyalayabilirsiniz.</p>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">Dosya Ekleri</label>
                <div className="mt-1">
                  <div
                    className={`border-2 border-dashed rounded-md p-4 cursor-pointer transition-colors ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
                      }`}
                    {...getRootProps()}
                  >
                    <input
                      {...getInputProps()}
                      id="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                    // HTML input accept özelliğini de kaldır
                    />
                    <p className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {isDragActive ? 'Dosyaları buraya bırakın...' : 'Dosyaları buraya sürükleyin veya dosya seçmek için tıklayın'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Tüm dosya türleri kabul edilir<br />
                      Maksimum dosya boyutu: {systemConfig.max_file_size_mb || 10}MB
                    </p>
                  </div>

                  {tempFiles.length > 0 && (
                    <ul className="mt-3 divide-y divide-gray-100 max-h-40 overflow-y-auto">
                      {tempFiles.map((file, index) => (
                        <li key={index} className="py-2 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm truncate max-w-xs">{file.name}</span>
                            </div>
                            <span className="ml-2 text-xs text-gray-500">
                              {file.size < 1024
                                ? `${file.size} B`
                                : file.size < 1024 * 1024
                                  ? `${(file.size / 1024).toFixed(1)} KB`
                                  : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.name)}
                            className="text-red-500 hover:text-red-700 focus:outline-none"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Talep Bilgileri</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="form-group">
                        <label htmlFor="department_id" className="block text-xs font-medium text-gray-700">Departman(lar)</label>
                        <Select
                          isMulti
                          name="department_id"
                          options={departmentOptions}
                          className="basic-multi-select"
                          classNamePrefix="select"
                          placeholder="Departman seçin..."
                          value={formData.department_id}
                          onChange={(selected) => {
                            setFormData(prev => ({
                              ...prev,
                              department_id: selected || [],
                              assignee_id: [] // Departman değişince kullanıcı seçimini sıfırla
                            }));
                          }}
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: '30px',
                              height: 'auto'
                            }),
                            valueContainer: (base) => ({
                              ...base,
                              padding: '2px 8px'
                            }),
                            input: (base) => ({
                              ...base,
                              margin: '0px',
                            }),
                            indicatorsContainer: (base) => ({
                              ...base,
                              height: '30px',
                            })
                          }}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="assignee_id" className="block text-xs font-medium text-gray-700">Atanacak Kişi(ler)</label>
                        <Select
                          isMulti
                          name="assignee_id"
                          options={[
                            { value: 'department', label: 'Departmana Ata (Herkes Görebilir/Atayabilir)' },
                            ...filteredUsers.map(user => ({
                              value: user.id,
                              label: `${user.full_name} (${user.username})`
                            }))
                          ]}
                          className="basic-multi-select"
                          classNamePrefix="select"
                          placeholder="Atama türü seçin..."
                          onChange={(selected) => setFormData(prev => ({ ...prev, assignee_id: selected || [] }))}
                          isDisabled={!formData.department_id || formData.department_id.length === 0}
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: '30px',
                              height: 'auto'
                            }),
                            valueContainer: (base) => ({
                              ...base,
                              padding: '2px 8px'
                            }),
                            input: (base) => ({
                              ...base,
                              margin: '0px',
                            }),
                            indicatorsContainer: (base) => ({
                              ...base,
                              height: '30px',
                            })
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {!formData.department_id || formData.department_id.length === 0
                            ? "Önce departman seçin"
                            : filteredUsers.length === 0
                              ? "Seçilen departmanlarda aktif kullanıcı bulunamadı"
                              : formData.assignee_id && formData.assignee_id.some(a => a.value === 'department')
                                ? "Seçilen departmanlardaki herkes bu talebi görebilir ve kendine atayabilir"
                                : formData.assignee_id && formData.assignee_id.length > 0
                                  ? "Sadece seçilen kişiler bu talep üzerinde çalışabilir"
                                  : "Atama türü seçin"
                          }
                          {filteredUsers.length > 0 && (
                            <span className="block">
                              Seçilen departmanlarda {filteredUsers.length} aktif kullanıcı var
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="form-group">
                        <label htmlFor="priority" className="block text-xs font-medium text-gray-700">Öncelik</label>
                        <select
                          id="priority"
                          name="priority"
                          value={formData.priority}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="low">Düşük</option>
                          <option value="medium">Orta</option>
                          <option value="high">Yüksek</option>
                          <option value="critical">Kritik</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="is_private"
                            name="is_private"
                            checked={formData.is_private}
                            onChange={handleChange}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label htmlFor="is_private" className="ml-2 block text-xs font-medium text-gray-700">
                            Gizli/Özel Talep (Sadece siz ve atanan kişi görebilir)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`bg-gray-50 rounded-lg p-3 ${formData.is_private ? 'opacity-50' : ''}`}>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="show_sharing"
                    checked={showSharingOptions}
                    onChange={(e) => setShowSharingOptions(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    disabled={formData.is_private}
                  />
                  <label htmlFor="show_sharing" className="ml-2 block text-sm font-medium text-gray-900 select-none cursor-pointer">
                    Paylaşım Seçenekleri
                  </label>
                </div>

                {showSharingOptions && (
                  <div className="space-y-3 pl-6 border-l-2 border-gray-200 ml-2">
                    <div className="form-group">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Kullanıcılarla Paylaş</label>
                      <Select
                        isMulti
                        name="shared_with_users"
                        options={userOptions}
                        className="basic-multi-select"
                        classNamePrefix="select"
                        placeholder="Kullanıcı seçin..."
                        onChange={(selected) => setFormData(prev => ({ ...prev, shared_with_users: selected || [] }))}
                        isDisabled={formData.is_private}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '30px',
                            height: '30px'
                          }),
                          valueContainer: (base) => ({
                            ...base,
                            padding: '0 8px'
                          }),
                          input: (base) => ({
                            ...base, argin: '0px',
                            margin: '0px',
                          }),
                          indicatorsContainer: (base) => ({
                            ...base, eight: '30px',
                            height: '30px',
                          })
                        }}
                      />
                      {formData.is_private && (
                        <p className="text-xs text-gray-500 mt-1">Gizli talepler paylaşılamaz.</p>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Departmanlarla Paylaş</label>
                      <Select
                        isMulti
                        name="shared_with_departments"
                        options={departmentOptions}
                        className="basic-multi-select"
                        classNamePrefix="select"
                        placeholder="Departman seçin..."
                        onChange={(selected) => setFormData(prev => ({ ...prev, shared_with_departments: selected || [] }))}
                        isDisabled={formData.is_private}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '30px',
                            height: '30px'
                          }),
                          valueContainer: (base) => ({
                            ...base,
                            padding: '0 8px'
                          }),
                          input: (base) => ({
                            ...base, argin: '0px',
                            margin: '0px',
                          }),
                          indicatorsContainer: (base) => ({
                            ...base, eight: '30px',
                            height: '30px',
                          })
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {(systemConfig.enable_teos_id || systemConfig.enable_citizenship_no) && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Ek Bilgiler</h3>
                  <div className="space-y-3">
                    {systemConfig.enable_teos_id && (
                      <div className="form-group">
                        <label htmlFor="teos_id" className="block text-xs font-medium text-gray-700">
                          Teos ID {systemConfig.require_teos_id && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          id="teos_id"
                          name="teos_id"
                          value={formData.teos_id}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          required={systemConfig.require_teos_id}
                        />
                      </div>
                    )}
                    {systemConfig.enable_citizenship_no && (
                      <div className="form-group">
                        <label htmlFor="citizenship_no" className="block text-xs font-medium text-gray-700">
                          Vatandaşlık No {systemConfig.require_citizenship_no && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          id="citizenship_no"
                          name="citizenship_no"
                          value={formData.citizenship_no}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          required={systemConfig.require_citizenship_no}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              className="bg-white py-1.5 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => navigate('/tickets')}
            >
              İptal
            </button>
            <button
              type="submit"
              className="ml-3 inline-flex justify-center py-1.5 px-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={submitting || uploadingFiles}
            >
              {submitting ? (
                <>Oluşturuluyor...</>
              ) : (
                'Talebi Oluştur'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTicket;