import React, { useState, useCallback } from 'react';
import type { ManagedFile, ChatMessage, Corpus,  CustomMetadata } from './types';
import { queryWithFiles } from './geminiService';
import { FileUpload } from './FileUpload';
import { FilePreviewList } from './FilePreview';
import { ChatBubble } from './ChatInterface';
import { SparkleIcon, CopyIcon, ExpandIcon, CheckCircleIcon, SettingsIcon, RemoveIcon, SearchIcon, DocumentChunksIcon, PromptIcon } from './components/icons';

type Step = 'create' | 'upload' | 'index' | 'query';

const STEPS: { id: Step; title: string }[] = [
  { id: 'create', title: 'Create Store' },
  { id: 'upload', title: 'Upload File' },
  { id: 'index', title: 'Index File' },
  { id: 'query', title: 'Query Store' },
];

const Stepper: React.FC<{ currentStep: Step }> = ({ currentStep }) => {
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center justify-center">
        {STEPS.map((step, stepIdx) => (
          <li key={step.title} className={`relative ${stepIdx !== STEPS.length - 1 ? 'pr-12 sm:pr-24' : ''}`}>
            {stepIdx < currentStepIndex && (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-indigo-600" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
                   <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                  </svg>
                </div>
              </>
            )}
            {stepIdx === currentStepIndex && (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-700" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 bg-gray-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" aria-hidden="true" />
                </div>
              </>
            )}
             {stepIdx > currentStepIndex && (
               <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-700" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-600 bg-gray-800">
                </div>
              </>
            )}
             <div className="absolute top-9 w-max -translate-x-1/2 text-center">
                <p className="font-medium text-sm text-gray-300">{step.title}</p>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

const CodeViewer: React.FC<{ code: string; children?: React.ReactNode }> = ({ code, children }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    
    return (
        <div className="bg-[#0D162A] rounded-lg overflow-hidden h-full flex flex-col">
            <div className="flex justify-between items-center py-2 px-4 bg-[#1E293B]/50">
                <p className="text-xs text-gray-400">Live Code</p>
                <div className="flex items-center gap-4">
                    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
                        <CopyIcon className="w-4 h-4" />
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
                        <ExpandIcon className="w-4 h-4" />
                        Expand
                    </button>
                </div>
            </div>
            <pre className="p-4 text-sm overflow-x-auto flex-1">
                <code className="font-mono text-cyan-300">{code}</code>
            </pre>
            {children}
        </div>
    );
}

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="px-4 pb-4">
        <div className="w-full bg-gray-700/50 rounded-full h-1.5">
            <div 
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);


const createStoreCode = `// In your server-side environment:
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Create the File Search store
const fileSearchStore = await ai.fileSearchStores.create({
  config: { displayName: "My Document Store" }
});

console.log(fileSearchStore.name);
// Expected output: "fileSearchStores/..."`;


const uploadFileCode = `// In your server-side environment:
import { GoogleGenAI } from "@google/genai";
import { createReadStream } from 'fs'; // For Node.js
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// The file to upload.
const filedata = {
  file: createReadStream('my-document.pdf'),
  config: {
    displayName: 'My Document'
  }
};

// This single API call uploads the file and starts the
// asynchronous indexing process.
await ai.fileSearchStores.files.upload(
    'fileSearchStores/my-store-123',
    filedata
);
`;

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('create');
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [managedFiles, setManagedFiles] = useState<ManagedFile[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [queryInput, setQueryInput] = useState('');

  // State for advanced settings
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [chunkingConfig, setChunkingConfig] = useState({ maxTokens: 1024, overlapTokens: 200 });
  const [customMetadata, setCustomMetadata] = useState<CustomMetadata[]>([]);

  const handleError = (message: string, e?: unknown) => {
    console.error(message, e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    setError(`${message}: ${errorMessage}`);
  };

  const handleCorpusCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;
    setError(null);
    setIsLoading(true);
    // This is a client-side operation, so it's instant.
    // We simulate the resource name that the API would return.
    const resourceName = `fileSearchStores/${storeName.trim().toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 12)}`;
    setCorpus({ displayName: storeName.trim(), resourceName });
    setTimeout(() => {
        setIsLoading(false);
        setCurrentStep('upload');
    }, 500); // Simulate network delay
  };

  const handleFileAdd = useCallback((files: File[]) => {
    const newFileIds: string[] = [];
    const newManagedFiles: ManagedFile[] = files.map(file => {
        const id = `${file.name}-${Date.now()}`;
        newFileIds.push(id);
        return { id, file, state: 'uploading' };
    });

    setManagedFiles(prev => [...prev, ...newManagedFiles]);
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const duration = 1500; // 1.5 seconds
    let startTime = Date.now();

    const interval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min((elapsedTime / duration) * 100, 100);
        setUploadProgress(progress);

        if (progress >= 100) {
            clearInterval(interval);
            setManagedFiles(prev => prev.map(mf => newFileIds.includes(mf.id) ? { ...mf, state: 'ready' } : mf));
            setIsUploading(false);
        }
    }, 50);

  }, []);

  const handleFileRemove = useCallback((fileId: string) => {
    setManagedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);
  
  const handleProceedToIndex = () => {
    setCurrentStep('index');
    // Simulate indexing
     setTimeout(() => {
        setCurrentStep('query');
    }, 1500);
  }

  const handleSendMessage = useCallback(async (query: string) => {
    if (!corpus) return;
    setError(null);

    const newUserMessage: ChatMessage = { role: 'user', content: query };
    setChatHistory(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const filesToQuery = managedFiles.map(mf => mf.file);
      const { text, sources } = await queryWithFiles(filesToQuery, query);
      const newModelMessage: ChatMessage = { role: 'model', content: text, sources };
      setChatHistory(prev => [...prev, newModelMessage]);

    } catch (e) {
      handleError("Error querying files", e);
      const newModelMessage: ChatMessage = { role: 'model', content: "Sorry, I encountered an error while searching your files." };
      setChatHistory(prev => [...prev, newModelMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [corpus, managedFiles]);

  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryInput.trim() && !isLoading) {
        handleSendMessage(queryInput.trim());
        setQueryInput('');
    }
  }
  
  // Handlers for advanced settings
  const handleAddMetadata = () => {
    setCustomMetadata(prev => [...prev, { id: `meta-${Date.now()}`, key: '', value: '' }]);
  };

  const handleRemoveMetadata = (id: string) => {
    setCustomMetadata(prev => prev.filter(meta => meta.id !== id));
  };

  const handleMetadataChange = (id: string, field: 'key' | 'value', text: string) => {
    setCustomMetadata(prev => prev.map(meta => meta.id === id ? { ...meta, [field]: text } : meta));
  };
  
  const queryStoreCode = `// In your server-side environment:
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "What are the main findings of the document?",
    config: {
        tools: [{
            fileSearch: {
                fileSearchStoreNames: ["${corpus?.resourceName || 'fileSearchStores/...'}"]
            }
        }]
    }
});

console.log(response.text);

// To get citations:
console.log(response.candidates?.[0]?.groundingMetadata?.groundingChunks);
`;

  const hasFiles = managedFiles.length > 0;

  return (
    <div className="min-h-screen font-sans flex flex-col items-center p-4 sm:p-8">
      <header className="text-center my-8 md:my-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          Geni File Search Tool
        </h1>
        <p className="text-lg text-gray-400 mt-2 max-w-2xl">
          Developed By: Sateesh Mandanapu
        </p>
      </header>
      
      <div className="w-full max-w-4xl mb-12 pt-10">
        <Stepper currentStep={currentStep} />
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg relative mb-6 w-full max-w-4xl mx-auto" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {currentStep === 'create' && (
        <div className="w-full max-w-4xl bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50">
            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-semibold mb-2 text-white">Step 1: Create a File Search Store</h2>
                    <p className="text-gray-400 mb-6 text-sm">A File Search store is a persistent container for your document embeddings. Data imported into a store is stored indefinitely until you manually delete it. Give it a descriptive name.</p>
                    <form onSubmit={handleCorpusCreate}>
                        <label htmlFor="store-name" className="block text-sm font-medium text-gray-300 mb-2">Store Display Name</label>
                        <input
                            id="store-name"
                            type="text"
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="e.g., 'Project Alpha Documents'"
                            className="w-full bg-gray-900/50 text-gray-200 rounded-lg px-4 py-2.5 mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none border border-gray-600"
                        />
                        <button
                            type="submit"
                            disabled={!storeName.trim() || isLoading}
                            className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            <SparkleIcon className="w-5 h-5" />
                            {isLoading ? 'Creating...' : 'Create Store'}
                        </button>
                    </form>
                </div>
                 <div>
                    <CodeViewer code={createStoreCode} />
                </div>
            </div>
        </div>
      )}
      
      {currentStep === 'upload' && corpus && (
        <div className="w-full max-w-4xl space-y-8">
            <div className="bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50">
                <div className="flex items-center gap-4 mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-semibold text-white">Step 1: Store Created</h2>
                        <p className="text-gray-400 text-sm">A new File Search Store has been successfully created.</p>
                    </div>
                </div>
                <div className="bg-black/20 p-4 rounded-lg text-sm font-mono break-all">
                    <p><span className="text-gray-400">Display Name:</span> {corpus.displayName}</p>
                    <p><span className="text-gray-400">Resource Name:</span> {corpus.resourceName}</p>
                </div>
            </div>

            <div className="bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50">
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-xl font-semibold mb-2 text-white">Step 2: Upload a File</h2>
                        <p className="text-gray-400 mb-6 text-sm">Upload a document to your store. This action sends the file to the API and starts the asynchronous indexing process. You can optionally configure chunking settings and add custom metadata.</p>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Select Document</label>
                        <FileUpload onFilesAdd={handleFileAdd} disabled={isLoading || isUploading} />
                         <div className="mt-6">
                            <button onClick={() => setShowAdvancedSettings(!showAdvancedSettings)} className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300">
                                <SettingsIcon className="w-5 h-5" />
                                {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
                            </button>
                        </div>

                        {showAdvancedSettings && (
                            <div className="mt-4 p-6 bg-black/20 rounded-lg border border-gray-700/50 space-y-6">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-200 mb-4">Chunking Configuration</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="max-tokens" className="block text-xs font-medium text-gray-400 mb-1">Max Tokens per Chunk</label>
                                            <input type="number" id="max-tokens" value={chunkingConfig.maxTokens} onChange={e => setChunkingConfig(c => ({ ...c, maxTokens: parseInt(e.target.value) }))} className="w-full bg-gray-900/50 text-gray-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none border border-gray-600" />
                                        </div>
                                        <div>
                                            <label htmlFor="overlap-tokens" className="block text-xs font-medium text-gray-400 mb-1">Max Overlap Tokens</label>
                                            <input type="number" id="overlap-tokens" value={chunkingConfig.overlapTokens} onChange={e => setChunkingConfig(c => ({ ...c, overlapTokens: parseInt(e.target.value) }))} className="w-full bg-gray-900/50 text-gray-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none border border-gray-600" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-200 mb-4">Custom Metadata</h3>
                                    <div className="space-y-3">
                                        {customMetadata.map((meta) => (
                                            <div key={meta.id} className="flex items-center gap-2">
                                                <input type="text" placeholder="Key" value={meta.key} onChange={e => handleMetadataChange(meta.id, 'key', e.target.value)} className="w-full bg-gray-900/50 text-gray-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none border border-gray-600" />
                                                <input type="text" placeholder="Value" value={meta.value} onChange={e => handleMetadataChange(meta.id, 'value', e.target.value)} className="w-full bg-gray-900/50 text-gray-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none border border-gray-600" />
                                                <button onClick={() => handleRemoveMetadata(meta.id)} className="p-2 text-gray-500 hover:text-red-400 rounded-md hover:bg-gray-700/50">
                                                    <RemoveIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleAddMetadata} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 font-medium">+ Add Metadata</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <CodeViewer code={uploadFileCode}>
                           {isUploading && <ProgressBar progress={uploadProgress} />}
                        </CodeViewer>
                    </div>
                </div>
                <FilePreviewList files={managedFiles} onRemoveFile={handleFileRemove} />
                <button
                    onClick={handleProceedToIndex}
                    disabled={!hasFiles || isUploading}
                    className="w-full mt-8 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                     <SparkleIcon className="w-5 h-5" />
                    Upload File
                </button>
            </div>
        </div>
      )}
      
      {currentStep === 'index' && (
        <div className="w-full max-w-4xl space-y-8">
            <div className="bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50">
                <div className="flex items-center gap-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-semibold text-white">Step 1: Store Created</h2>
                        <p className="text-gray-400 text-sm">A new File Search Store has been successfully created.</p>
                    </div>
                </div>
            </div>
            <div className="bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50">
                <div className="flex items-center gap-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-semibold text-white">Step 2: File Uploaded</h2>
                        <p className="text-gray-400 text-sm">The file has been successfully sent to the API to begin processing.</p>
                    </div>
                </div>
            </div>
            <div className="bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50 text-center">
                <h2 className="text-xl font-semibold mb-2 text-white">Step 3: Indexing Files</h2>
                <p className="text-gray-400 mb-6 text-sm">Your files are being processed and indexed for efficient querying.</p>
                <div className="flex justify-center items-center gap-3 text-indigo-400">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>Processing...</p>
                </div>
            </div>
        </div>
      )}

       {currentStep === 'query' && corpus && (
         <div className="w-full max-w-4xl space-y-8">
            <div className="bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50">
                <div className="flex items-center gap-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-semibold text-white">Step 1: Store Created</h2>
                        <p className="text-gray-400 text-sm">A new File Search Store has been successfully created.</p>
                    </div>
                </div>
            </div>
            <div className="bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50">
                <div className="flex items-center gap-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-semibold text-white">Step 2: File Uploaded</h2>
                        <p className="text-gray-400 text-sm">The file has been successfully sent to the API to begin processing.</p>
                    </div>
                </div>
            </div>
            <div className="bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50">
                <div className="flex items-center gap-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-semibold text-white">Step 3: File Indexed</h2>
                        <p className="text-gray-400 text-sm">The file has been successfully processed and is ready to be queried.</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#1E293B]/30 p-8 rounded-2xl shadow-lg border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-2 text-white">Step 4: Query the Store</h2>
                <p className="text-gray-400 mb-6 text-sm">
                    Now that your file is indexed, you can ask questions. The model will use the content of your document to generate a grounded response, complete with citations. This is a form of Retrieval-Augmented Generation (RAG).
                </p>
                
                <form onSubmit={handleSendQuery} className="relative mb-8">
                    <input
                        type="text"
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        placeholder="e.g., 'Summarize the key points of the document'"
                        className="w-full bg-gray-900/50 text-gray-200 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none border border-gray-600"
                        disabled={isLoading || !hasFiles}
                    />
                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:opacity-50" disabled={isLoading || !hasFiles || !queryInput.trim()}>
                        <SearchIcon className="w-5 h-5" />
                    </button>
                </form>

                {chatHistory.length === 0 && !isLoading ? (
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-base font-semibold text-center mb-6 text-white">How RAG Works</h3>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm">1</div>
                                    <p className="text-gray-300 text-sm">Your query is sent to the File Search store.</p>
                                </li>
                                <li className="pl-4"><div className="h-6 w-px bg-gray-600"></div></li>
                                <li className="flex items-center gap-4">
                                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center"><DocumentChunksIcon className="w-5 h-5" /></div>
                                    <p className="text-gray-300 text-sm">Relevant document chunks are retrieved.</p>
                                </li>
                                 <li className="pl-4"><div className="h-6 w-px bg-gray-600"></div></li>
                                <li className="flex items-center gap-4">
                                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center"><PromptIcon className="w-5 h-5" /></div>
                                    <p className="text-gray-300 text-sm">The retrieved context is added to your original prompt.</p>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <CodeViewer code={queryStoreCode} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4">
                        {chatHistory.map((msg, index) => <ChatBubble key={index} message={msg} />)}
                        {isLoading && (
                            <div className="flex items-start gap-3 justify-start">
                                <div className="w-8 h-8 flex-shrink-0 bg-indigo-600 rounded-full flex items-center justify-center animate-pulse"><SparkleIcon className="w-5 h-5 text-white" /></div>
                                <div className="max-w-xl p-4 rounded-2xl bg-gray-700 text-gray-200 rounded-tl-none">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default App;