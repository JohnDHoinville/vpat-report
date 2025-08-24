import React, { useState, useRef, useCallback } from 'react';

/**
 * EvidenceUpload Component
 * 
 * Handles file upload functionality for manual testing evidence.
 * Supports drag and drop, image previews, file validation, and upload progress.
 */
const EvidenceUpload = ({ 
  onFileUpload, 
  onFileRemove, 
  existingFiles = [], 
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'],
  multiple = true 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  // Validate file before upload
  const validateFile = (file) => {
    const errors = [];

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
    }

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      errors.push(`File "${file.name}" type is not supported. Accepted types: ${acceptedTypes.join(', ')}.`);
    }

    return errors;
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return 'fas fa-image';
    if (fileType === 'application/pdf') return 'fas fa-file-pdf';
    return 'fas fa-file';
  };

  // Handle file selection
  const handleFiles = useCallback(async (files) => {
    const fileArray = Array.from(files);
    const newErrors = [];
    const validFiles = [];

    // Validate each file
    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
      } else {
        validFiles.push(file);
      }
    });

    setErrors(newErrors);

    // Upload valid files
    for (const file of validFiles) {
      const fileId = `${Date.now()}_${file.name}`;
      
      try {
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Simulate upload progress (replace with actual upload logic)
        const uploadPromise = simulateFileUpload(file, (progress) => {
          setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
        });

        const uploadResult = await uploadPromise;

        // Remove from progress tracking
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });

        // Call the upload callback
        if (onFileUpload) {
          onFileUpload({
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            url: uploadResult.url,
            uploadedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setErrors(prev => [...prev, `Failed to upload "${file.name}": ${error.message}`]);
        
        // Remove from progress tracking
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    }
  }, [maxFileSize, acceptedTypes, onFileUpload]);

  // Simulate file upload (replace with actual API call)
  const simulateFileUpload = (file, onProgress) => {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Simulate upload completion
          setTimeout(() => {
            resolve({
              url: URL.createObjectURL(file), // In real implementation, this would be the server URL
              id: `upload_${Date.now()}`
            });
          }, 500);
        }
        onProgress(Math.min(progress, 100));
      }, 200);
    });
  };

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop event
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Handle file input change
  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Handle file removal
  const handleRemoveFile = (fileId) => {
    if (onFileRemove) {
      onFileRemove(fileId);
    }
  };

  // Open file selector
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Clear errors
  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-purple-400 bg-purple-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <i className="fas fa-cloud-upload-alt text-4xl"></i>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {dragActive ? 'Drop files here' : 'Upload evidence files'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop files here, or{' '}
              <button
                type="button"
                onClick={openFileSelector}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                browse
              </button>
            </p>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Supported formats: {acceptedTypes.map(type => type.split('/')[1]).join(', ')}</p>
            <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploading...</h4>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="bg-gray-50 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">{fileId.split('_')[1]}</span>
                <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex">
              <i className="fas fa-exclamation-triangle text-red-400 mr-2 mt-0.5"></i>
              <div>
                <h4 className="text-sm font-medium text-red-800">Upload Errors</h4>
                <ul className="mt-1 text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={clearErrors}
              className="text-red-400 hover:text-red-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Existing Files List */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Evidence Files</h4>
          <div className="grid grid-cols-1 gap-2">
            {existingFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <i className={`${getFileIcon(file.type)} text-gray-400`}></i>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Preview for images */}
                  {file.type.startsWith('image/') && (
                    <button
                      onClick={() => window.open(file.url, '_blank')}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                      title="Preview image"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                  )}
                  
                  {/* Download link */}
                  <a
                    href={file.url}
                    download={file.name}
                    className="text-green-600 hover:text-green-700 text-sm"
                    title="Download file"
                  >
                    <i className="fas fa-download"></i>
                  </a>
                  
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                    title="Remove file"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          {existingFiles.length} file{existingFiles.length !== 1 ? 's' : ''} uploaded
        </span>
        {existingFiles.length > 0 && (
          <button
            onClick={openFileSelector}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Add more files
          </button>
        )}
      </div>
    </div>
  );
};

export default EvidenceUpload; 