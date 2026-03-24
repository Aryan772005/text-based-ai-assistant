import { useState } from 'react';
import { Plus, MessageSquare, Trash2, LogOut, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import type { Conversation } from '../services/conversations';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
  userEmail: string;
}

export default function Sidebar({
  conversations, activeId, onSelect, onNew, onDelete, onSignOut, userEmail
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const grouped = groupByDate(conversations);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo">
            <div className="logo-t" style={{width:'22px', height:'22px', fontSize:'13px', borderRadius:'5px'}}>T</div>
            <span style={{marginLeft: '8px'}}>Tariani's AI</span>
          </div>
        )}
        <button className="icon-btn collapse-btn" onClick={() => setCollapsed(v => !v)} title="Toggle sidebar">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <button className="new-chat-btn" onClick={onNew} title="New chat">
        <Plus size={16} />
        {!collapsed && <span>New chat</span>}
      </button>

      <div className={`conv-item ${activeId === 'dashboard' ? 'active' : ''}`} style={{ margin: '0 10px 12px' }} onClick={() => onSelect('dashboard')}>
        <LayoutDashboard size={16} className="conv-icon" />
        {!collapsed && <span className="conv-title" style={{ fontWeight: 500 }}>Dashboard</span>}
      </div>

      {!collapsed && (
        <div className="conversation-list">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="conv-group-label">{group}</div>
              {items.map(c => (
                <div
                  key={c.id}
                  className={`conv-item ${c.id === activeId ? 'active' : ''}`}
                  onClick={() => onSelect(c.id)}
                >
                  <MessageSquare size={14} className="conv-icon" />
                  <span className="conv-title">{c.title}</span>
                  <button
                    className="conv-delete"
                    onClick={e => { e.stopPropagation(); onDelete(c.id); }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="conv-empty">No conversations yet</div>
          )}
        </div>
      )}

      <div className="sidebar-footer">
        <div className="user-info">
          {!collapsed && <span className="user-email" title={userEmail}>{userEmail}</span>}
          <button className="icon-btn signout-btn" onClick={onSignOut} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function groupByDate(convs: Conversation[]): Record<string, Conversation[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const week = new Date(today); week.setDate(today.getDate() - 7);
  const month = new Date(today); month.setDate(today.getDate() - 30);

  const groups: Record<string, Conversation[]> = {
    Today: [], Yesterday: [], 'Previous 7 Days': [], 'Previous 30 Days': [], Older: []
  };
  for (const c of convs) {
    const d = new Date(c.updated_at);
    if (d >= today) groups['Today'].push(c);
    else if (d >= yesterday) groups['Yesterday'].push(c);
    else if (d >= week) groups['Previous 7 Days'].push(c);
    else if (d >= month) groups['Previous 30 Days'].push(c);
    else groups['Older'].push(c);
  }
  // Remove empty groups
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
}
