import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axiosInstance from '../../utils/axios';

const FileDropzone = ({ ticketId, onUploadComplete, maxFileSizeMB = 10 }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', acceptedFiles[0]);
    
    try {
      const response = await axiosInstance.post(
        `/tickets/${ticketId}/attachments/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );
      
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setError(error.response?.data?.detail || 'Dosya yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  }, [ticketId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    }
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-primary-600">Dosyayı buraya bırakın...</p>
        ) : (
          <div>
            <p className="text-gray-600">Dosya yüklemek için tıklayın veya sürükleyip bırakın</p>
            <p className="text-xs text-gray-500 mt-1">
              Desteklenen formatlar: JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
            </p>
            <p className="text-xs text-gray-500">Maksimum dosya boyutu: {maxFileSizeMB}MB</p>
          </div>
        )}
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 text-center">
            Yükleniyor... {uploadProgress}%
          </p>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 text-center p-2 bg-red-50 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
