import React, { useState } from 'react';
import axiosInstance from '../../utils/axios';
import { API_BASE_URL } from '../../config/api';

const FileList = ({ files, onFileDelete, ticketId }) => {
  const [previewImage, setPreviewImage] = useState(null);

  if (!files || files.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Henüz eklenmiş dosya bulunmamaktadır.
      </div>
    );
  }

  const getFileIcon = (contentType, fileId, fileName) => {
    // Görüntü dosyaları için küçük resim göster
    if (contentType.includes('image')) {
      return (
        <div 
          className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setPreviewImage({
            url: `${API_BASE_URL}/attachments/${fileId}`,
            name: fileName
          })}
        >
          <img 
            src={`${API_BASE_URL}/attachments/${fileId}`} 
            alt="Önizleme" 
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    
    // PDF dosyaları
    if (contentType.includes('pdf')) {
      return (
        <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
          <path d="M8 7a1 1 0 011 1v3a1 1 0 01-1 1H7a1 1 0 01-1-1V8a1 1 0 011-1h1zm4 0a1 1 0 011 1v6a1 1 0 01-1 1h-1a1 1 0 01-1-1V8a1 1 0 011-1h1z" />
        </svg>
      );
    } 
    // Word/Office dosyaları
    else if (contentType.includes('word') || contentType.includes('document')) {
      return (
        <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
          <path d="M8 7a1 1 0 00-1 1v3a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1H8z" />
        </svg>
      );
    } 
    // Excel dosyaları
    else if (contentType.includes('excel') || contentType.includes('sheet')) {
      return (
        <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
          <path d="M7 7h6v2H7V7zm0 4h6v2H7v-2z" />
        </svg>
      );
    } 
    // Diğer dosyalar
    else {
      return (
        <svg className="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = async (file) => {
    try {
      const downloadPath = file.download_url
        ? file.download_url.replace(/^\/api\//, '')
        : `attachments/${file.id}`;
      const response = await axiosInstance.get(downloadPath, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', file.filename || `attachment_${file.id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Dosya indirilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/attachments/${fileId}`);
      if (onFileDelete) {
        onFileDelete(fileId);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Dosya silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div>
      <div className="overflow-auto max-h-80">
        <ul className="divide-y divide-gray-200">
          {files.map((file) => (
            <li key={file.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {getFileIcon(file.content_type, file.id, file.filename)}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.filename}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                  <p className="text-xs text-gray-400">{new Date(file.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(file)}
                  className="p-1.5 text-primary-600 hover:text-primary-800 rounded-full hover:bg-primary-50"
                  title="İndir"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                {onFileDelete && (
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-1.5 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                    title="Sil"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Resim Önizleme Modalı */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="max-w-5xl max-h-screen bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 truncate">{previewImage.name}</h3>
              <button 
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => setPreviewImage(null)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2 flex items-center justify-center" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
              <img
                src={previewImage.url}
                alt="Resim önizleme"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="p-4 bg-gray-100 flex justify-end">
              <a 
                href={previewImage.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                download
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                İndir
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList;
