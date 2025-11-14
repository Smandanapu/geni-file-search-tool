import React from 'react';
import type { ManagedFile } from '../types';
import { RemoveIcon, CheckCircleIcon, FileIcon, SpinnerIcon } from './icons';

interface FilePreviewListProps {
  files: ManagedFile[];
  onRemoveFile: (fileId: string) => void;
}

const FileStatusIcon: React.FC<{ state: ManagedFile['state'] }> = ({ state }) => {
    switch (state) {
        case 'uploading':
            return <SpinnerIcon className="w-5 h-5 text-indigo-400" title="Uploading..." />;
        case 'ready':
            return <CheckCircleIcon className="w-5 h-5 text-green-400" title="Ready" />;
        case 'failed':
             return <CheckCircleIcon className="w-5 h-5 text-red-400" title="Failed" />;
        default:
            return null;
    }
}

export const FilePreviewList: React.FC<FilePreviewListProps> = ({ files, onRemoveFile }) => {
  if (files.length === 0) {
    return (
        <div className="mt-6 text-center text-sm text-gray-500">
            Upload some files to get started.
        </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {files.map((managedFile) => (
          <li
            key={managedFile.id}
            className="flex items-center justify-between bg-gray-800 p-3 rounded-lg animate-fade-in"
          >
            <div className="flex items-center min-w-0 gap-3">
              <FileIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-200 truncate" title={managedFile.file.name}>
                {managedFile.file.name}
              </span>
              <FileStatusIcon state={managedFile.state} />
            </div>
            <button
              onClick={() => onRemoveFile(managedFile.id)}
              className="p-1 rounded-full text-gray-500 hover:bg-gray-700 hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label={`Remove ${managedFile.file.name}`}
            >
              <RemoveIcon className="w-5 h-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};