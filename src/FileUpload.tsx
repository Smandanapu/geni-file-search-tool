# import React, { useState, useRef, useCallback } from 'react';
import { FileIcon } from './icons';

interface FileUploadProps {
  onFilesAdd: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesAdd, className, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdd(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [onFilesAdd, disabled]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdd(Array.from(e.target.files));
    }
  };

  const handleClick = () => {
    if (!disabled) {
        fileInputRef.current?.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
        ${isDragging ? 'border-indigo-500 bg-indigo-900/10' : 'border-gray-600'}
        ${!disabled && 'cursor-pointer hover:border-indigo-600 hover:bg-gray-800/50'}
        ${disabled && 'opacity-50 cursor-not-allowed'}
        ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept="text/*,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center space-y-2">
        <FileIcon className="w-12 h-12 text-gray-500" />
        <p className="text-sm font-semibold text-gray-300">
           <span className="text-indigo-400">Upload a file</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">PDF, TXT, MD up to 10MB</p>
      </div>
    </div>
  );
};