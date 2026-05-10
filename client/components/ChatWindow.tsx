"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { soundManager } from '@/lib/sounds';
import { Send, MoreVertical, Search, Paperclip, Smile, Phone, Video, X, Reply, Trash2, Check, CheckCheck, UserPlus, Shield, Flag } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import axios from 'axios';

interface ChatWindowProps {
  ws: WebSocket | null;
  onStartCall?: (targetUserId: string, targetUserName: string, type: 'audio' | 'video') => void;
}

export default function ChatWindow({ ws, onStartCall }: ChatWindowProps) {
  const { activeChat, activeChatUser, messages, user, typing, onlineStatus, replyingTo, setReplyingTo, contacts, setContacts, clearChat, setActiveChat } = useStore();
  const [input, setInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveContactModal, setShowSaveContactModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeChat && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeChat]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!ws || !activeChat || !activeChatUser || !user) return;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'typing',
        receiver_id: activeChatUser.id,
        is_typing: isTyping
      }));
    }
  }, [ws, activeChat, activeChatUser, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Send typing indicator
    sendTypingIndicator(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const handleSend = () => {
    if (!input.trim() || !ws || !activeChat || !activeChatUser || !user) return;
    
    const payload: any = {
      type: 'message',
      chat_id: activeChat,
      content: input.trim(),
      receiver_id: activeChatUser.id
    };

    // Add reply info if replying
    if (replyingTo) {
      payload.reply_to = replyingTo.message_id || replyingTo.id;
      payload.reply_text = replyingTo.content.substring(0, 50);
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      setInput('');
      setReplyingTo(null);
      sendTypingIndicator(false);
      soundManager.playMessageSent();
    }
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    if (activeChatUser && onStartCall) {
      onStartCall(activeChatUser.id, activeChatUser.username, type);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // Format phone number with country code
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'Unknown';
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 0) return 'Unknown';
    
    // If it starts with +, keep it
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Add + if it looks like a country code is missing
    if (cleaned.length > 10) {
      return `+${cleaned}`;
    }
    
    return phone;
  };

  // Check if user is in contacts
  const isInContacts = activeChatUser ? contacts.some(c => c.contact_id === activeChatUser.id) : false;

  // Get display name for the chat user
  const getDisplayName = () => {
    if (!activeChatUser) return 'Unknown';
    
    const contact = contacts.find(c => c.contact_id === activeChatUser.id);
    if (contact?.display_name) return contact.display_name;
    
    // If not in contacts, show formatted phone number instead of username
    if (!isInContacts && activeChatUser.phone) {
      return formatPhoneNumber(activeChatUser.phone);
    }
    
    return activeChatUser.username || 'Unknown';
  };

  // Handle save contact
  const handleSaveContact = async () => {
    if (!activeChatUser || !displayName.trim() || !user) return;
    
    setSavingContact(true);
    try {
      await axios.post('http://localhost:8080/api/contacts', {
        contact_id: activeChatUser.id,
        display_name: displayName,
        phone: activeChatUser.phone
      }, {
        headers: { 'user_id': user.id }
      });
      
      // Refresh contacts
      const res = await axios.get('http://localhost:8080/api/contacts', {
        headers: { 'user_id': user.id }
      });
      setContacts(res.data || []);
      
      setShowSaveContactModal(false);
      setDisplayName('');
    } catch (err) {
      console.error('Failed to save contact:', err);
    } finally {
      setSavingContact(false);
    }
  };

  // Open save contact modal
  const openSaveContactModal = () => {
    if (!activeChatUser) return;
    setDisplayName(activeChatUser.username || '');
    setShowSaveContactModal(true);
  };

  // Filter messages for current chat
  const filteredMessages = messages.filter(m => 
    (m.sender_id === activeChat && m.receiver_id === user?.id) ||
    (m.sender_id === user?.id && m.receiver_id === activeChat)
  );

  // Apply search filter if searching
  const displayMessages = searchQuery 
    ? filteredMessages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredMessages;

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof displayMessages }[] = [];
  displayMessages.forEach((msg) => {
    const date = msg.created_at 
      ? new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
      : 'Today';
    
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date, messages: [msg] });
    }
  });

  // Get typing status for current chat
  const typingInfo = activeChat ? typing[activeChat] : null;
  const isTyping = typingInfo?.isTyping && typingInfo.userId !== user?.id;

  // Get online status
  const chatUserStatus = activeChatUser ? onlineStatus[activeChatUser.id] : null;
  const isOnline = chatUserStatus?.isOnline || activeChatUser?.is_online;

  // Empty state - no chat selected
  if (!activeChat || !activeChatUser) {
    return (
      <div className="flex-1 h-full bg-[#222e35] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative top bar */}
      <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#00a884] to-[#02735e]" />
        
        <div className="text-center px-8 max-w-md animate-fade-in">
          {/* Illustration */}
          <div className="w-[320px] h-[188px] mx-auto mb-10 opacity-90">
            <svg viewBox="0 0 320 188" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="32" y="20" width="256" height="148" rx="8" fill="#202c33" stroke="#2a3942" strokeWidth="2"/>
              <rect x="48" y="40" width="80" height="108" rx="4" fill="#111b21"/>
              <rect x="144" y="40" width="128" height="108" rx="4" fill="#0b141a"/>
              <circle cx="88" cy="60" r="16" fill="#2a3942"/>
              <rect x="56" y="84" width="64" height="8" rx="4" fill="#2a3942"/>
              <rect x="56" y="96" width="48" height="6" rx="3" fill="#374045"/>
              <rect x="56" y="108" width="64" height="8" rx="4" fill="#2a3942"/>
              <rect x="56" y="120" width="40" height="6" rx="3" fill="#374045"/>
              <rect x="56" y="132" width="56" height="8" rx="4" fill="#2a3942"/>
              <rect x="160" y="56" width="96" height="24" rx="4" fill="#005c4b"/>
              <rect x="160" y="88" width="80" height="24" rx="4" fill="#202c33"/>
              <rect x="160" y="120" width="96" height="24" rx="4" fill="#005c4b"/>
              <circle cx="160" cy="168" r="12" fill="#00a884"/>
              <path d="M156 168l4 4 8-8" stroke="#111b21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h1 className="text-[32px] font-light text-[#e9edef] mb-4 tracking-tight">
            ChatterBox for Web
          </h1>
          
          <p className="text-[#8696a0] text-[14px] leading-6 mb-8">
            Send and receive messages without keeping your phone online.<br/>
            Use ChatterBox on up to 4 linked devices and 1 phone at the same time.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-[#8696a0] text-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative min-w-0">
      {/* Header */}
      <div className="h-[60px] bg-[#202c33] shrink-0 px-4 flex items-center justify-between border-b border-[#2a3942]/30">
        <div className="flex items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white font-medium mr-[15px] shadow-lg">
            {getDisplayName()?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[#e9edef] text-[16px] font-normal group-hover:text-white transition-smooth">
              {getDisplayName()}
            </div>
            <div className="text-[13px]">
              {isTyping ? (
                <span className="text-[#00a884]">typing...</span>
              ) : isOnline ? (
                <span className="text-[#00a884]">online</span>
              ) : chatUserStatus?.lastSeen ? (
                <span className="text-[#8696a0]">
                  last seen {new Date(chatUserStatus.lastSeen).toLocaleString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              ) : (
                <span className="text-[#8696a0]">{activeChatUser.bio || 'Hey there!'}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {!isInContacts && (
            <button 
              onClick={openSaveContactModal}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#00a884] hover:bg-[#374248] transition-smooth"
              title="Save Contact"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => handleStartCall('video')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#aebac1] hover:bg-[#374248] transition-smooth"
          >
            <Video className="w-5 h-5" />
          </button>
          <button 
            onClick={() => handleStartCall('audio')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#aebac1] hover:bg-[#374248] transition-smooth"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#aebac1] hover:bg-[#374248] transition-smooth"
          >
            <Search className="w-5 h-5" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#aebac1] hover:bg-[#374248] transition-smooth"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} />
                <div 
                  className="absolute right-0 top-full mt-2 rounded-lg shadow-2xl py-2 min-w-[200px] z-[70] animate-slide-in"
                  style={{ backgroundColor: '#233138', border: '1px solid rgba(42,57,66,0.6)' }}
                >
                  <button
                    className="w-full px-6 py-[12px] text-left text-[#d1d7db] text-[15px] transition-smooth"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#182229'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => { setShowMenu(false); alert('Contact info coming soon!'); }}
                  >
                    Contact info
                  </button>
                  <button
                    className="w-full px-6 py-[12px] text-left text-[#d1d7db] text-[15px] transition-smooth"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#182229'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setShowMenu(false)}
                  >
                    Select messages
                  </button>
                  <button
                    className="w-full px-6 py-[12px] text-left text-[#d1d7db] text-[15px] transition-smooth"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#182229'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => { setShowMenu(false); setActiveChat(null, null); }}
                  >
                    Close chat
                  </button>
                  <button
                    className="w-full px-6 py-[12px] text-left text-[#d1d7db] text-[15px] transition-smooth"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#182229'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setShowMenu(false)}
                  >
                    Mute notifications
                  </button>
                  <button
                    className="w-full px-6 py-[12px] text-left text-[#d1d7db] text-[15px] transition-smooth"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#182229'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => { 
                      setShowMenu(false); 
                      if(window.confirm('Are you sure you want to clear messages in this chat?')) {
                        clearChat(activeChat || '');
                      }
                    }}
                  >
                    Clear chat
                  </button>
                  <button
                    className="w-full px-6 py-[12px] text-left text-[#d1d7db] text-[15px] transition-smooth"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#182229'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => {
                      setShowMenu(false);
                      if(window.confirm('Are you sure you want to block this user?')) {
                        alert('User blocked');
                        setActiveChat(null, null);
                      }
                    }}
                  >
                    Block
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-[#111b21] px-4 py-2 flex items-center gap-3 border-b border-[#2a3942] animate-slide-in">
          <Search className="w-5 h-5 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-[#e9edef] outline-none placeholder:text-[#8696a0]"
            autoFocus
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
            <X className="w-5 h-5 text-[#8696a0] hover:text-white" />
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto chat-bg custom-scrollbar py-3 px-[4%] sm:px-[5%] lg:px-[7%]">
        {filteredMessages.length === 0 ? (
          <div className="flex justify-center mt-8 animate-fade-in">
            <div className="bg-[#182229] text-[#8696a0] text-[12.5px] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
              Messages are end-to-end encrypted. No one outside of this chat can read them.
            </div>
          </div>
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx}>
              {/* Date separator */}
              <div className="flex justify-center my-3">
                <div className="bg-[#182229] text-[#8696a0] text-[12.5px] px-3 py-1 rounded-md shadow">
                  {group.date}
                </div>
              </div>
              
              {/* Messages */}
              {group.messages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                const time = msg.created_at 
                  ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                  : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // Check if it's the first message from this sender in a row
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                const messageId = msg.message_id || msg.id || `${msg.sender_id}-${idx}`;
                
                return (
                  <div 
                    key={messageId} 
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : 'mt-[2px]'} group/message`}
                    style={{ paddingLeft: isMe ? '15%' : '0', paddingRight: isMe ? '0' : '15%' }}
                  >
                    <div 
                      className={`relative max-w-[75%] px-3 pt-[6px] pb-2 shadow-sm
                        ${msg.is_deleted ? 'italic opacity-70' : ''}
                        ${isMe 
                          ? `bg-[#005c4b] ${isFirstInGroup ? 'rounded-tl-lg' : 'rounded-tl-lg'} rounded-bl-lg rounded-br-lg ${isFirstInGroup ? 'rounded-tr-none' : 'rounded-tr-lg'}` 
                          : `bg-[#202c33] ${isFirstInGroup ? 'rounded-tr-lg' : 'rounded-tr-lg'} rounded-br-lg rounded-bl-lg ${isFirstInGroup ? 'rounded-tl-none' : 'rounded-tl-lg'}`
                        }`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setShowMessageMenu(showMessageMenu === messageId ? null : messageId);
                      }}
                    >
                      {/* Message tail */}
                      {isFirstInGroup && (
                        <div 
                          className={`absolute top-0 w-2 h-[13px] ${
                            isMe 
                              ? 'right-[-8px] bg-[#005c4b]' 
                              : 'left-[-8px] bg-[#202c33]'
                          }`}
                          style={{
                            clipPath: isMe 
                              ? 'polygon(0 0, 100% 0, 0 100%)' 
                              : 'polygon(100% 0, 0 0, 100% 100%)'
                          }}
                        />
                      )}

                      {/* Reply preview */}
                      {msg.reply_text && (
                        <div className={`text-xs mb-1 pb-1 border-l-2 pl-2 ${
                          isMe ? 'border-[#06cf9c] bg-[#004a3d]' : 'border-[#00a884] bg-[#182229]'
                        } rounded`}>
                          <span className="text-[#00a884] text-[11px]">Reply</span>
                          <p className="text-[#8696a0] truncate">{msg.reply_text}</p>
                        </div>
                      )}
                      
                      <div className="flex items-end gap-1">
                        <span className="text-[#e9edef] text-[14.2px] leading-[19px] break-words whitespace-pre-wrap">
                          {msg.is_deleted ? '🚫 This message was deleted' : msg.content}
                        </span>
                        <span className={`text-[11px] ml-2 shrink-0 flex items-center gap-0.5 ${
                          isMe ? 'text-[rgba(255,255,255,0.6)]' : 'text-[#8696a0]'
                        }`}>
                          {time}
                          {isMe && (
                            msg.status === 'read' ? (
                              <CheckCheck className="w-4 h-4 text-[#53bdeb] ml-0.5" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-4 h-4 text-[#8696a0] ml-0.5" />
                            ) : (
                              <Check className="w-4 h-4 text-[#8696a0] ml-0.5" />
                            )
                          )}
                        </span>
                      </div>

                      {/* Message context menu */}
                      {showMessageMenu === messageId && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowMessageMenu(null)} />
                          <div className={`absolute ${isMe ? 'right-0' : 'left-0'} top-full mt-1 bg-[#233138] rounded-lg shadow-xl py-2 w-40 z-50 animate-slide-in`}>
                            <button
                              onClick={() => {
                                setReplyingTo(msg);
                                setShowMessageMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-[#e9edef] hover:bg-[#182229] text-sm flex items-center gap-3"
                            >
                              <Reply className="w-4 h-4" />
                              Reply
                            </button>
                            {isMe && !msg.is_deleted && (
                              <button
                                onClick={() => {
                                  // TODO: Implement delete
                                  setShowMessageMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#182229] text-sm flex items-center gap-3"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="bg-[#1f2c33] px-4 py-2 flex items-center gap-3 border-t border-[#2a3942]">
          <div className="w-1 h-10 bg-[#00a884] rounded-full" />
          <div className="flex-1 min-w-0">
            <span className="text-[#00a884] text-xs">
              Replying to {replyingTo.sender_id === user?.id ? 'yourself' : activeChatUser?.username}
            </span>
            <p className="text-[#8696a0] text-sm truncate">{replyingTo.content}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-[#8696a0] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#202c33] px-3 py-[6px] flex items-center gap-1.5 shrink-0 relative border-t border-[#2a3942]/30">
        {/* Emoji Picker */}
        <EmojiPicker
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSelect={handleEmojiSelect}
        />

        <button 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            showEmojiPicker ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#d1d7db]'
          } hover:bg-[#374248]`}
        >
          <Smile className="w-6 h-6" />
        </button>
        
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#374248] transition-all duration-200">
          <Paperclip className="w-5 h-5 rotate-45" />
        </button>
        
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message"
            style={{ borderRadius: '8px' }}
            className="w-full bg-[#2a3942] text-[#e9edef] text-[15px] px-4 py-[9px] rounded-lg border-0 outline-none placeholder:text-[#8696a0] focus:ring-2 focus:ring-[#00a884]/30"
          />
        </div>
        
        <button 
          onClick={handleSend}
          disabled={!input.trim()}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            input.trim() 
              ? 'bg-[#00a884] text-white hover:bg-[#06cf9c]' 
              : 'text-[#8696a0] hover:bg-[#374248]'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Save Contact Modal */}
      {showSaveContactModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowSaveContactModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#233138] rounded-lg shadow-2xl w-full max-w-md animate-fade-in">
              <div className="p-6">
                <h3 className="text-[#e9edef] text-[20px] font-medium mb-2">Save Contact</h3>
                <p className="text-[#8696a0] text-sm mb-6">
                  Save {activeChatUser?.phone || 'this number'} to your contacts
                </p>

                <div className="mb-6">
                  <label className="text-[#8696a0] text-xs uppercase tracking-wide block mb-2">Contact name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter contact name"
                    className="w-full bg-[#182229] text-white px-4 py-3 rounded-lg border border-[#2a3942] focus:border-[#00a884] outline-none text-[15px]"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveContact()}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSaveContactModal(false)}
                    className="flex-1 py-3 bg-[#2a3942] hover:bg-[#3b4a54] text-white font-medium rounded-lg transition-smooth"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContact}
                    disabled={savingContact || !displayName.trim()}
                    className="flex-1 py-3 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-medium rounded-lg transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingContact ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#111b21] border-t-transparent rounded-full spinner" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Save Contact
                      </>
                    )}
                  </button>
                </div>

                {/* Optional quick actions */}
                <div className="mt-6 pt-6 border-t border-[#2a3942]">
                  <p className="text-[#8696a0] text-xs uppercase tracking-wide mb-3">Quick actions</p>
                  <div className="flex gap-3">
                    <button
                      className="flex-1 py-2.5 bg-[#182229] hover:bg-[#202c33] text-[#e9edef] text-sm rounded-lg transition-smooth flex items-center justify-center gap-2"
                      title="Block this contact"
                    >
                      <Shield className="w-4 h-4" />
                      Block
                    </button>
                    <button
                      className="flex-1 py-2.5 bg-[#182229] hover:bg-[#202c33] text-[#e9edef] text-sm rounded-lg transition-smooth flex items-center justify-center gap-2"
                      title="Report this contact"
                    >
                      <Flag className="w-4 h-4" />
                      Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
