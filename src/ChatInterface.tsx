import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Source } from '../types';
import { SparkleIcon, FileIcon } from './icons';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isInputDisabled: boolean;
}

const SourcePill: React.FC<{source: Source}> = ({source}) => (
    <div className="mt-2 mr-2 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-gray-600 text-gray-200 rounded-full">
        <FileIcon className="w-3 h-3" />
        <span>{source.fileName}</span>
    </div>
)

export const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isModel = message.role === 'model';
  return (
    <div className={`flex items-start gap-3 ${isModel ? 'justify-start' : 'justify-end'}`}>
      {isModel && <div className="w-8 h-8 flex-shrink-0 bg-indigo-600 rounded-full flex items-center justify-center"><SparkleIcon className="w-5 h-5 text-white" /></div>}
      <div
        className={`max-w-2xl p-4 rounded-2xl ${
          isModel ? 'bg-gray-700 text-gray-200 rounded-tl-none' : 'bg-indigo-600 text-white rounded-br-none'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.sources && message.sources.length > 0 && (
            <div className="mt-2 border-t border-gray-600 pt-2">
                <h4 className="text-xs font-bold text-gray-400 mb-1">SOURCES:</h4>
                <div>
                    {message.sources.map((source, index) => <SourcePill key={`${source.fileName}-${index}`} source={source} />)}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};


export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading, isInputDisabled }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-2xl shadow-lg">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <SparkleIcon className="w-16 h-16 mb-4" />
            <h2 className="text-xl font-semibold">Start the conversation</h2>
            <p>Ask a question about the content of your files.</p>
          </div>
        ) : (
          messages.map((msg, index) => <ChatBubble key={index} message={msg} />)
        )}
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
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isInputDisabled ? 'Add a file to begin' : 'Ask a question...'}
            disabled={isInputDisabled || isLoading}
            rows={1}
            className="w-full bg-gray-700 text-gray-200 rounded-xl py-3 pl-4 pr-14 resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={isInputDisabled || isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w_3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.105 4.29a.75.75 0 011.06-.02l10.25 6.833a.75.75 0 010 1.294l-10.25 6.833a.75.75 0 01-1.04-1.08l2.63-3.51-2.63-3.51a.75.75 0 01.02-1.06z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
