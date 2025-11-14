// Represents a Corpus (file store) session created in the browser.
export interface Corpus {
  displayName: string;
  resourceName: string;
}

// Represents a File managed locally in the browser.
export interface ManagedFile {
  id: string; // A unique ID for React keys, e.g., timestamp + name
  file: File;
  state: 'uploading' | 'ready' | 'failed';
}

// A source for a model's response, linking back to a managed file.
export interface Source {
  fileName: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  sources?: Source[];
}

// Represents a key-value pair for custom metadata.
export interface CustomMetadata {
  id: string;
  key: string;
  value: string;
}
