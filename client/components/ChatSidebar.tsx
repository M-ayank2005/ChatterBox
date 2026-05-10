"use client";

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Search, MessageCirclePlus, MoreVertical, X, UserPlus, LogOut, ArrowLeft, Check, Users, Settings } from 'lucide-react';
import ProfilePanel from './ProfilePanel';
import CreateGroupModal from './CreateGroupModal';

interface SearchUser {
  id: string;
  username: string;
  phone: string;
  bio: string;
  avatar: string;
}

export default function ChatSidebar() {
  const { user, activeChat, setActiveChat, setActiveGroup, contacts, setContacts, groups, setGroups, logout, messages, onlineStatus, addMessages } = useStore();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'groups'>('chats');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [searchResult, setSearchResult] = useState<SearchUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [recentChats, setRecentChats] = useState<Array<{userId: string, lastMessage: string, time: string, unread?: number}>>([]);
  const [loadedChats, setLoadedChats] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Fetch contacts, groups, and recent chats on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [contactsRes, groupsRes, recentChatsRes] = await Promise.all([
          axios.get('http://localhost:8080/api/contacts', { headers: { 'user_id': user.id } }),
          axios.get('http://localhost:8080/api/groups', { headers: { 'user_id': user.id } }),
          axios.get('http://localhost:8080/api/recent-chats', { headers: { 'user_id': user.id } }).catch(() => ({ data: [] }))
        ]);
        setContacts(contactsRes.data || []);
        setGroups(groupsRes.data || []);
        
        // Load messages for each recent chat partner
        const recentPartners = recentChatsRes.data || [];
        for (const partner of recentPartners) {
          if (partner.user_id && !loadedChats.has(partner.user_id)) {
            try {
              const messagesRes = await axios.get(`http://localhost:8080/api/messages/${partner.user_id}`, {
                headers: { 'user_id': user.id }
              });
              if (messagesRes.data && messagesRes.data.length > 0) {
                addMessages(messagesRes.data);
                setLoadedChats(prev => new Set(prev).add(partner.user_id));
              }
            } catch (err) {
              console.error('Failed to load messages for', partner.user_id, err);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
        setContacts([]);
        setGroups([]);
      }
    };
    fetchData();
  }, [user, setContacts, setGroups, addMessages, loadedChats]);

  // Extract recent chats from messages
  useEffect(() => {
    if (!user || !messages.length) {
      setRecentChats([]);
      return;
    }

    const chatMap = new Map<string, {userId: string, lastMessage: string, time: string}>();
    
    // Sort messages by time to get latest
    const sortedMessages = [...messages].reverse();
    
    sortedMessages.forEach(msg => {
      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (otherUserId && otherUserId !== user.id && !chatMap.has(otherUserId)) {
        const time = msg.created_at 
          ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          : '';
        chatMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: msg.content,
          time
        });
      }
    });

    setRecentChats(Array.from(chatMap.values()));
  }, [messages, user]);

  const handleSearchUser = async () => {
    if (!phoneSearch.trim()) return;
    setLoading(true);
    setSearchResult(null);
    try {
      const res = await axios.get(`http://localhost:8080/api/search-user?phone=${phoneSearch}`);
      setSearchResult(res.data);
      setDisplayName(res.data.username);
    } catch {
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!searchResult || !displayName.trim()) return;
    setAddingContact(true);
    try {
      await axios.post('http://localhost:8080/api/contacts', {
        contact_id: searchResult.id,
        display_name: displayName,
        phone: searchResult.phone
      }, {
        headers: { 'user_id': user?.id }
      });
      
      // Refresh contacts
      const res = await axios.get('http://localhost:8080/api/contacts', {
        headers: { 'user_id': user?.id }
      });
      setContacts(res.data || []);
      
      // Open chat with new contact
      openChat(searchResult.id, searchResult);
      resetNewChat();
    } catch {
      // Handle error silently
    } finally {
      setAddingContact(false);
    }
  };

  const startChatWithUser = () => {
    if (!searchResult) return;
    openChat(searchResult.id, searchResult);
    resetNewChat();
  };

  const resetNewChat = () => {
    setShowNewChat(false);
    setPhoneSearch('');
    setDisplayName('');
    setSearchResult(null);
  };

  // Helper function to open chat and load messages
  const openChat = async (userId: string, chatUser: any) => {
    setActiveChat(userId, chatUser);
    
    // Load messages for this chat if not already loaded
    if (!loadedChats.has(userId) && user) {
      try {
        const messagesRes = await axios.get(`http://localhost:8080/api/messages/${userId}`, {
          headers: { 'user_id': user.id }
        });
        if (messagesRes.data && messagesRes.data.length > 0) {
          addMessages(messagesRes.data);
          setLoadedChats(prev => new Set(prev).add(userId));
        }
      } catch (err) {
        console.error('Failed to load messages for chat', userId, err);
      }
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  const filteredContacts = contacts.filter(c => 
    c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const filteredChats = recentChats.filter(chat => {
    const contact = contacts.find(c => c.contact_id === chat.userId);
    const name = contact?.display_name || contact?.user?.phone || 'Unknown';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // New Chat Panel
  if (showNewChat) {
    return (
      <div className="w-full bg-[#111b21] border-r border-[#2a3942] flex flex-col h-full">
        {/* Header */}
        <div className="h-[108px] bg-[#202c33] flex flex-col justify-end px-6 pb-5">
          <div className="flex items-center gap-6">
            <ArrowLeft 
              className="w-6 h-6 text-[#d9dee0] cursor-pointer hover:text-white transition-smooth" 
              onClick={resetNewChat}
            />
            <h2 className="text-[19px] font-medium text-white">New chat</h2>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-3 py-2 bg-[#111b21]">
          <div className="bg-[#202c33] rounded-lg flex items-center px-4 py-[7px] gap-6">
            <Search className="w-[18px] h-[18px] text-[#8696a0]" />
            <input 
              type="tel"
              placeholder="Search by phone number"
              className="flex-1 bg-transparent text-[#d1d7db] text-[15px] outline-none placeholder-[#8696a0]"
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
            />
          </div>
        </div>

        <button
          onClick={handleSearchUser}
          disabled={loading || !phoneSearch.trim()}
          className="mx-3 my-2 py-2.5 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-medium rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#111b21] border-t-transparent rounded-full spinner" />
              Searching...
            </span>
          ) : 'Find User'}
        </button>

        {/* Search Result */}
        {searchResult && (
          <div className="flex-1 px-3 animate-fade-in">
            <div className="bg-[#202c33] rounded-xl p-4 mt-2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-xl font-medium">
                  {searchResult.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium text-[17px]">{searchResult.username}</h3>
                  <p className="text-[#8696a0] text-sm">{searchResult.phone}</p>
                </div>
              </div>

              {searchResult.bio && (
                <p className="text-[#8696a0] text-sm mb-4 pl-1">{searchResult.bio}</p>
              )}

              <div className="mb-4">
                <label className="text-[#8696a0] text-xs uppercase tracking-wide block mb-2">Save contact as</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contact name"
                  className="w-full bg-[#111b21] text-white px-4 py-3 rounded-lg border border-[#2a3942] focus:border-[#00a884] outline-none text-[15px]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={startChatWithUser}
                  className="flex-1 py-3 bg-[#2a3942] hover:bg-[#3b4a54] text-white font-medium rounded-lg transition-smooth"
                >
                  Chat Only
                </button>
                <button
                  onClick={handleAddContact}
                  disabled={addingContact || !displayName.trim()}
                  className="flex-1 py-3 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-medium rounded-lg transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingContact ? (
                    <div className="w-4 h-4 border-2 border-[#111b21] border-t-transparent rounded-full spinner" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Save & Chat
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contacts List for quick selection */}
        {!searchResult && contacts.length > 0 && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-6 py-3 text-[#00a884] text-xs font-medium uppercase tracking-wider">
              Your Contacts
            </div>
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => {
                  openChat(contact.contact_id, contact.user);
                  resetNewChat();
                }}
                className="flex items-center px-4 py-3 cursor-pointer hover:bg-[#202c33] transition-smooth"
              >
                <div className="w-[49px] h-[49px] rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-lg font-medium mr-[15px]">
                  {contact.display_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 border-b border-[#222d34] py-[14px] -my-3 -mr-4 pr-4">
                  <h3 className="text-white text-[17px] truncate">{contact.display_name}</h3>
                  <p className="text-[#8696a0] text-[13px] truncate mt-0.5">
                    {contact.user?.bio || contact.phone}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main Sidebar
  return (
    <div className="w-full bg-[#111b21] border-r border-[#2a3942] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-[60px] bg-[#202c33] flex items-center justify-between px-4 shrink-0 border-b border-[#2a3942]/30">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setShowProfile(true)}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white font-medium text-[15px] shadow-lg group-hover:scale-105 transition-smooth">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#aebac1] hover:bg-[#374248] transition-smooth"
            title="New group"
          >
            <Users className="w-[22px] h-[22px]" />
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#aebac1] hover:bg-[#374248] transition-smooth"
            title="New chat"
          >
            <MessageCirclePlus className="w-[22px] h-[22px]" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#aebac1] hover:bg-[#374248] transition-smooth"
            >
              <MoreVertical className="w-[22px] h-[22px]" />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[#233138] rounded-lg shadow-2xl py-2.5 w-56 z-[70] animate-slide-in border border-[#2a3942]/50">
                  <button
                    onClick={() => { setShowProfile(true); setShowMenu(false); }}
                    className="w-full px-6 py-[10px] text-left text-[#d1d7db] hover:bg-[#182229] text-[14.5px] transition-smooth flex items-center gap-3"
                  >
                    <Settings className="w-4 h-4" />
                    Profile & Settings
                  </button>
                  <button
                    onClick={() => { setShowCreateGroup(true); setShowMenu(false); }}
                    className="w-full px-6 py-[10px] text-left text-[#d1d7db] hover:bg-[#182229] text-[14.5px] transition-smooth flex items-center gap-3"
                  >
                    <Users className="w-4 h-4" />
                    New group
                  </button>
                  <button
                    onClick={() => { setActiveTab('contacts'); setShowMenu(false); }}
                    className="w-full px-6 py-[10px] text-left text-[#d1d7db] hover:bg-[#182229] text-[14.5px] transition-smooth"
                  >
                    Contacts
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-6 py-[10px] text-left text-[#d1d7db] hover:bg-[#182229] text-[14.5px] transition-smooth flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex bg-[#202c33] border-b border-[#2a3942]/30">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-[14px] text-[13px] font-medium tracking-wide uppercase transition-smooth relative ${
            activeTab === 'chats' 
              ? 'text-[#00a884]' 
              : 'text-[#8696a0] hover:text-[#aebac1]'
          }`}
        >
          Chats
          {activeTab === 'chats' && (
            <div className="absolute bottom-0 left-[20%] right-[20%] h-[3px] bg-[#00a884] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-[14px] text-[13px] font-medium tracking-wide uppercase transition-smooth relative ${
            activeTab === 'contacts' 
              ? 'text-[#00a884]' 
              : 'text-[#8696a0] hover:text-[#aebac1]'
          }`}
        >
          Contacts
          {activeTab === 'contacts' && (
            <div className="absolute bottom-0 left-[20%] right-[20%] h-[3px] bg-[#00a884] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-[14px] text-[13px] font-medium tracking-wide uppercase transition-smooth relative ${
            activeTab === 'groups' 
              ? 'text-[#00a884]' 
              : 'text-[#8696a0] hover:text-[#aebac1]'
          }`}
        >
          Groups
          {activeTab === 'groups' && (
            <div className="absolute bottom-0 left-[20%] right-[20%] h-[3px] bg-[#00a884] rounded-full" />
          )}
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="px-2.5 py-[6px] bg-[#111b21]">
        <div className="bg-[#202c33] rounded-lg flex items-center px-4 py-[7px] gap-6 focus-within:bg-[#2a3942] transition-smooth">
          <Search className="w-[18px] h-[18px] text-[#8696a0]" />
          <input 
            placeholder={activeTab === 'chats' ? 'Search or start new chat' : 'Search contacts'}
            className="flex-1 bg-transparent text-[#d1d7db] text-[15px] outline-none placeholder-[#8696a0]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'chats' ? (
          // Chats Tab
          filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] px-8 text-center">
              <div className="w-[72px] h-[72px] rounded-full bg-[#202c33] flex items-center justify-center mb-5">
                <MessageCirclePlus className="w-8 h-8 text-[#8696a0]" />
              </div>
              <h3 className="text-[#e9edef] text-[17px] font-medium mb-1.5">No chats yet</h3>
              <p className="text-[#8696a0] text-[13px] leading-5 mb-6 max-w-[200px]">Start messaging by tapping the new chat button</p>
              <button 
                onClick={() => setShowNewChat(true)}
                className="px-6 py-2.5 hover:bg-[#06cf9c] text-[14px] font-medium rounded-full transition-smooth shadow-lg shadow-[#00a884]/20"
                style={{ backgroundColor: '#00a884', color: '#111b21' }}
              >
                Start New Chat
              </button>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const contact = contacts.find(c => c.contact_id === chat.userId);
              const name = contact?.display_name || contact?.user?.phone || contact?.user?.username || 'Unknown';
              
              return (
                <div
                  key={chat.userId}
                  onClick={() => {
                    const chatUser = contact?.user || { id: chat.userId, username: name, phone: '', bio: '', avatar: '' };
                    openChat(chat.userId, chatUser);
                  }}
                  className={`flex items-center px-3 cursor-pointer hover:bg-[#202c33] transition-smooth ${
                    activeChat === chat.userId ? 'bg-[#2a3942]' : ''
                  }`}
                >
                  <div className="w-[49px] h-[49px] rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-lg font-medium mr-[13px] shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 border-b border-[#222d34] py-[13px]">
                    <div className="flex justify-between items-center mb-[2px]">
                      <h3 className="text-white text-[17px] truncate pr-2">{name}</h3>
                      <span className="text-[#8696a0] text-[12px] shrink-0">{chat.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-[#53bdeb] shrink-0" />
                      <p className="text-[#8696a0] text-[14px] truncate">{chat.lastMessage}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : activeTab === 'contacts' ? (
          // Contacts Tab
          filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] px-8 text-center">
              <div className="w-[72px] h-[72px] rounded-full bg-[#202c33] flex items-center justify-center mb-5">
                <UserPlus className="w-8 h-8 text-[#8696a0]" />
              </div>
              <h3 className="text-[#e9edef] text-[17px] font-medium mb-1.5">No contacts yet</h3>
              <p className="text-[#8696a0] text-[13px] leading-5 mb-6 max-w-[200px]">Add contacts to quickly start conversations</p>
              <button 
                onClick={() => setShowNewChat(true)}
                className="px-6 py-2.5 hover:bg-[#06cf9c] text-[14px] font-medium rounded-full transition-smooth shadow-lg shadow-[#00a884]/20"
                style={{ backgroundColor: '#00a884', color: '#111b21' }}
              >
                Add Contact
              </button>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => openChat(contact.contact_id, contact.user)}
                className={`flex items-center px-3 cursor-pointer hover:bg-[#202c33] transition-smooth ${
                  activeChat === contact.contact_id ? 'bg-[#2a3942]' : ''
                }`}
              >
                <div className="w-[49px] h-[49px] rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-lg font-medium mr-[13px] shrink-0">
                  {contact.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0 border-b border-[#222d34] py-[13px]">
                  <h3 className="text-white text-[17px] truncate mb-[2px]">{contact.display_name}</h3>
                  <p className="text-[#8696a0] text-[14px] truncate">
                    {contact.user?.bio || contact.phone || 'Hey there! I am using ChatApp'}
                  </p>
                </div>
              </div>
            ))
          )
        ) : (
          // Groups Tab
          groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] px-8 text-center">
              <div className="w-[72px] h-[72px] rounded-full bg-[#202c33] flex items-center justify-center mb-5">
                <Users className="w-8 h-8 text-[#8696a0]" />
              </div>
              <h3 className="text-[#e9edef] text-[17px] font-medium mb-1.5">No groups yet</h3>
              <p className="text-[#8696a0] text-[13px] leading-5 mb-6 max-w-[220px]">Create a group to chat with multiple people</p>
              <button 
                onClick={() => setShowCreateGroup(true)}
                className="px-6 py-2.5 hover:bg-[#06cf9c] text-[14px] font-medium rounded-full transition-smooth shadow-lg shadow-[#00a884]/20"
                style={{ backgroundColor: '#00a884', color: '#111b21' }}
              >
                Create Group
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setActiveGroup(group)}
                className={`flex items-center px-3 cursor-pointer hover:bg-[#202c33] transition-smooth ${
                  activeChat === group.id ? 'bg-[#2a3942]' : ''
                }`}
              >
                <div className="w-[49px] h-[49px] rounded-full bg-gradient-to-br from-[#667781] to-[#3b4a54] flex items-center justify-center text-white text-lg font-medium mr-[13px] shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 border-b border-[#222d34] py-[13px]">
                  <h3 className="text-white text-[17px] truncate mb-[2px]">{group.name}</h3>
                  <p className="text-[#8696a0] text-[14px] truncate">
                    {group.members?.length || 0} members
                  </p>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Profile Panel */}
      <ProfilePanel 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </div>
  );
}
