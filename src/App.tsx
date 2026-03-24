import React, { useState, useRef, useEffect, useCallback } from 'react';
import './index.css';
import { getAIResponse, fileToBase64 } from './services/ai';
import { signOut } from './services/auth';
import {
  createConversation,
  updateConversationTitle,
  listConversations,
  deleteConversation,
  saveMessage,
  loadMessages,
} from './services/conversations';
import type { Conversation } from './services/conversations';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import type { Session } from '@supabase/supabase-js';
import {
  Bot, Send, Mic, MicOff, Paperclip, ImagePlus, X, FileText, Sparkles, Sun, Moon, User, LogOut, Menu
} from 'lucide-react';

interface AttachedFile {
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

interface UIMessage {
  id: string;
  role: 'user' | 'ai';
  text?: string;
  files?: AttachedFile[];
  timestamp: Date;
}

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

const SUGGESTIONS = [
  '✨ Write me a short poem',
  '🧠 Explain quantum computing simply',
  '💡 Give me a fun project idea',
  '🖼️ Analyze an image I upload',
];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function RecentFilesView() {
  const [files, setFiles] = useState<{ url: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('messages')
      .select('media_urls, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
         const allFiles: any[] = [];
         if (data) {
           data.forEach(msg => {
             if (msg.media_urls && msg.media_urls.length > 0) {
               msg.media_urls.forEach((url: string) => allFiles.push({ url, date: msg.created_at }))
             }
           })
         }
         setFiles(allFiles);
         setLoading(false);
      });
  }, []);

  return (
    <div className="dashboard-view">
      <div className="dash-hero" style={{ padding: '32px' }}>
        <h1>Your Recent Files</h1>
        <p>A gallery of all the media and documents you've analyzed with Tariani's Engine.</p>
      </div>
      {loading ? <div className="spinner" style={{margin:'40px auto'}}/> : 
        files.length === 0 ? <div style={{textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)'}}>No files uploaded yet. Start a chat and attach an image!</div> :
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '20px'}}>
           {files.map((f, i) => (
             <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
               <div style={{background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'var(--transition)', cursor: 'pointer'}}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-active)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  {f.url.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?|$)/i) ? (
                    <img src={f.url} style={{width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px'}} />
                  ) : (
                    <div style={{width: '100%', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px'}}>
                      <FileText size={48} color="var(--accent-2)" />
                    </div>
                  )}
                  <div style={{marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500}}>
                    {new Date(f.date).toLocaleDateString()} {new Date(f.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
               </div>
             </a>
           ))}
        </div>
      }
    </div>
  );
}

function AIInsightsView() {
  const [stats, setStats] = useState({ convs: 0, msgs: 0 });
  
  useEffect(() => {
    Promise.all([
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true })
    ]).then(([convRes, msgRes]) => {
      setStats({ convs: convRes.count || 0, msgs: msgRes.count || 0 });
    });
  }, []);

  return (
    <div className="dashboard-view">
      <div className="dash-hero" style={{ padding: '32px' }}>
        <h1>AI Insights & Statistics</h1>
        <p>Analytics from your interactions with Tariani's Engine.</p>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginTop: '12px'}}>
        <div style={{background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(168,85,247,0.15))', border: '1px solid var(--accent-1)', borderRadius: '24px', padding: '40px 32px', textAlign: 'center', boxShadow: '0 0 30px rgba(124,92,252,0.1)'}}>
           <div style={{fontSize: '56px', fontWeight: 700, color: 'var(--accent-1)', letterSpacing: '-2px'}}>{stats.convs}</div>
           <div style={{color: 'var(--text-secondary)', marginTop: '12px', fontSize: '16px', fontWeight: 500}}>Total Conversations</div>
        </div>
        <div style={{background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.15))', border: '1px solid var(--success)', borderRadius: '24px', padding: '40px 32px', textAlign: 'center', boxShadow: '0 0 30px rgba(52,211,153,0.1)'}}>
           <div style={{fontSize: '56px', fontWeight: 700, color: 'var(--success)', letterSpacing: '-2px'}}>{stats.msgs}</div>
           <div style={{color: 'var(--text-secondary)', marginTop: '12px', fontSize: '16px', fontWeight: 500}}>Messages Exchanged</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>('dashboard');
  const [messages, setMessages] = useState<UIMessage[]>([]);

  const [input, setInput] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load conversations when logged in
  useEffect(() => {
    if (session) loadConvs();
    else {
      setConversations([]);
      setActiveConvId('dashboard');
      setMessages([]);
    }
  }, [session]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Handle theme
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [theme]);

  const loadConvs = async () => {
    const list = await listConversations();
    setConversations(list);
  };

  const selectConversation = async (id: string) => {
    setActiveConvId(id);
    setError(null);
    const dbMsgs = await loadMessages(id);
    const ui: UIMessage[] = dbMsgs.map(m => ({
      id: m.id,
      role: m.role === 'assistant' ? 'ai' : 'user',
      text: m.content,
      timestamp: new Date(m.created_at),
    }));
    setMessages(ui);
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
    setAttachedFiles([]);
    setError(null);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConvId === id) handleNewChat();
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = Array.from(e.target.files || []);
    const newFiles: AttachedFile[] = await Promise.all(
      files.map(async (file) => {
        if (type === 'image' && file.type.startsWith('image/')) {
          const preview = await fileToBase64(file);
          return { file, preview, type: 'image' as const };
        }
        return { file, type: 'file' as const };
      })
    );
    setAttachedFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Speech recognition not supported. Try Chrome.'); return; }
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
    };
    recognition.onerror = (event: any) => { setError(`Speech error: ${event.error}`); setIsRecording(false); };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setError(null);
  }, []);

  const stopRecording = useCallback(() => { recognitionRef.current?.stop(); setIsRecording(false); }, []);

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;
    if (isLoading || !session) return;

    setError(null);
    const userId = session.user.id;
    const currentInput = input.trim();
    const currentFiles = [...attachedFiles];

    const userMsg: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput || undefined,
      files: currentFiles.length > 0 ? currentFiles : undefined,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      // Create conversation if none active
      let convId = activeConvId;
      if (!convId) {
        const title = currentInput ? currentInput.slice(0, 50) : 'New Chat';
        const conv = await createConversation(userId, title);
        convId = conv.id;
        setActiveConvId(convId);
        setConversations(prev => [conv, ...prev]);
      } else if (messages.length === 0 && currentInput) {
        // Update title from first message
        await updateConversationTitle(convId, currentInput.slice(0, 50));
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: currentInput.slice(0, 50) } : c));
      }

      // Save user message
      await saveMessage(convId, userId, 'user', currentInput || '[media]');

      // Build content for AI
      type ContentPart = { type: string; text?: string; image_url?: { url: string } };
      let content: string | ContentPart[] = currentInput || 'Describe this image or file.';
      const imageFiles = currentFiles.filter(f => f.type === 'image' && f.preview);
      if (imageFiles.length > 0) {
        const parts: ContentPart[] = [];
        if (currentInput) parts.push({ type: 'text', text: currentInput });
        for (const f of imageFiles) parts.push({ type: 'image_url', image_url: { url: f.preview! } });
        content = parts;
      }

      const response = await getAIResponse([{ role: 'user', content }]);

      // Save AI message
      await saveMessage(convId, userId, 'assistant', response);

      const aiMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);

      // Refresh sidebar to update updated_at ordering
      loadConvs();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSuggestion = (s: string) => {
    const clean = s.replace(/^[\p{Emoji}\s]+/u, '').trim();
    setInput(clean);
    textareaRef.current?.focus();
  };

  const canSend = (input.trim().length > 0 || attachedFiles.length > 0) && !isLoading;

  if (!authReady) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="typing-bubble"><div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/></div>
      </div>
    );
  }

  if (!session) return <AuthScreen onAuth={() => {}} />;

  return (
    <div className="app-container layout-with-sidebar">
      <div className="sidebar-backdrop" onClick={() => document.body.classList.remove('sidebar-open')}></div>
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={selectConversation}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        onSignOut={handleSignOut}
        userEmail={session.user.email ?? ''}
      />

      <div className="main-panel">
        {/* Header */}
        <header className="header" style={{ background: 'var(--bg-glass)' }}>
          <div className="header-left">
            <button className="icon-btn mobile-menu-btn" onClick={() => document.body.classList.add('sidebar-open')}>
              <Menu size={20} />
            </button>
            <div className="header-logo"><div className="logo-t">T</div></div>
            <div className="header-info">
              <div className="header-title">
                {activeConvId === 'dashboard' ? "Tariani's AI Dashboard" :
                 activeConvId === 'recent-files' ? "Your Recent Files" :
                 activeConvId === 'ai-insights' ? "AI Insights" :
                 activeConvId ? conversations.find(c => c.id === activeConvId)?.title || "Tariani's AI" : "Tariani's AI Assistant"}
              </div>
              <div className="header-subtitle">
                <span className="status-dot" />
                <span>Powered by Tariani's Creation · Online</span>
              </div>
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button className="icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle Light/Dark Mode">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-glass)', padding: '6px 14px', borderRadius: '30px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c5cfc, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '13px' }}>
                  {session.user.email?.charAt(0).toUpperCase() || <User size={14} />}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {session.user.email?.split('@')[0]}
                </span>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'var(--border)', margin: '0 4px' }} />
              <button 
                onClick={handleSignOut} 
                title="Sign Out"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 4px', transition: 'var(--transition)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Custom Views */}
        {activeConvId === 'recent-files' ? (
          <RecentFilesView />
        ) : activeConvId === 'ai-insights' ? (
          <AIInsightsView />
        ) : activeConvId === 'dashboard' ? (
          <div className="dashboard-view">
            <div className="dash-hero">
              <div className="dash-hero-bg"></div>
              <h1>Welcome back to Tariani's AI</h1>
              <p>Your centralized hub for AI creativity and memory.</p>
            </div>
            <div className="dash-grid">
              <div className="dash-card" onClick={handleNewChat}>
                <Sparkles size={24} className="dash-icon" />
                <h3>New Creation</h3>
                <p>Start a new interactive session with Tariani's engine.</p>
              </div>
              <div className="dash-card" onClick={() => setActiveConvId('recent-files')} style={{ cursor: 'pointer' }}>
                <FileText size={24} className="dash-icon" />
                <h3>Recent Files</h3>
                <p>View the media and documents you've uploaded.</p>
              </div>
              <div className="dash-card" onClick={() => setActiveConvId('ai-insights')} style={{ cursor: 'pointer' }}>
                <Bot size={24} className="dash-icon" />
                <h3>AI Insights</h3>
                <p>Explore usage statistics and AI behavior patterns.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                <div className="logo-t" style={{width: '64px', height: '64px', fontSize: '32px', borderRadius: '16px'}}>T</div>
              </div>
              <h1 className="welcome-title">How can I help you today?</h1>
              <p className="welcome-sub">Ask me anything, upload images or files, or speak your question using the mic.</p>
              <div className="welcome-chips">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="chip" onClick={() => handleSuggestion(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-inner">
              {messages.map(msg => (
                <div key={msg.id} className={`message-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  <div className={`msg-avatar ${msg.role === 'ai' ? 'ai' : 'user-av'}`}>
                    {msg.role === 'ai' ? <div className="logo-t" style={{width:'24px', height:'24px', fontSize:'14px', borderRadius:'6px'}}>T</div> : <User size={16} color="white" />}
                  </div>
                  <div>
                    <div className="msg-bubble">
                      {msg.text && <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>}
                      {msg.files?.map((f, i) =>
                        f.type === 'image' && f.preview
                          ? <img key={i} src={f.preview} alt={f.file.name} className="msg-image" />
                          : <div key={i} className="msg-file"><FileText size={14} />{f.file.name}</div>
                      )}
                    </div>
                    <div className="msg-timestamp">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message-row ai">
                  <div className="msg-avatar ai"><Bot size={16} color="white" /></div>
                  <div className="typing-bubble">
                    <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

              {/* Input Area Overlay */}
              <div className="input-area" style={{ background: 'rgba(10, 10, 15, 0.4)' }}>
          {error && <div className="error-bar"><X size={14} />{error}</div>}
          {attachedFiles.length > 0 && (
            <div className="media-previews">
              {attachedFiles.map((f, i) => (
                <div key={i} className="preview-item">
                  {f.type === 'image' && f.preview
                    ? <img src={f.preview} alt={f.file.name} />
                    : <div className="preview-item-file"><FileText size={14} />{f.file.name}</div>}
                  <button className="preview-remove" onClick={() => removeFile(i)}>×</button>
                </div>
              ))}
            </div>
          )}

          <div className={`input-box ${isRecording ? 'recording' : ''}`}>
            <input ref={imageInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'image')} />
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFileSelect(e, 'file')} />

            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? '🔴 Listening…' : "Message Tariani's AI… (Enter to send, Shift+Enter for newline)"}
              rows={1}
              disabled={isLoading}
            />
            <div className="action-btns">
              <button className="icon-btn" title="Attach image" onClick={() => imageInputRef.current?.click()} disabled={isLoading}><ImagePlus size={18} /></button>
              <button className="icon-btn" title="Attach file" onClick={() => fileInputRef.current?.click()} disabled={isLoading}><Paperclip size={18} /></button>
              <button className={`icon-btn ${isRecording ? 'recording-btn' : ''}`} title={isRecording ? 'Stop' : 'Speak'} onClick={isRecording ? stopRecording : startRecording} disabled={isLoading}>
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button className="send-btn" title="Send" onClick={handleSend} disabled={!canSend}><Send size={16} /></button>
            </div>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
