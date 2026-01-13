"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import axios from 'axios';
import { X, ArrowLeft, Users, Check, Search, Camera } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { user, contacts, addGroup } = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setSearch('');
    }
  }, [isOpen]);

  const toggleMember = (contactId: string) => {
    setSelectedMembers(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    setCreating(true);
    try {
      const res = await axios.post('http://localhost:8080/api/groups', {
        name: groupName,
        description: groupDescription,
        members: selectedMembers
      }, {
        headers: { 'user_id': user?.id }
      });
      addGroup(res.data);
      onClose();
    } catch (err) {
      console.error('Failed to create group', err);
    } finally {
      setCreating(false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#111b21] flex flex-col animate-slide-in">
      {/* Header */}
      <div className="h-[108px] bg-[#202c33] flex flex-col justify-end px-6 pb-5">
        <div className="flex items-center gap-6">
          <ArrowLeft 
            className="w-6 h-6 text-[#d9dee0] cursor-pointer hover:text-white transition-all" 
            onClick={() => step === 1 ? onClose() : setStep(1)}
          />
          <h2 className="text-[19px] font-medium text-white">
            {step === 1 ? 'Add group members' : 'New group'}
          </h2>
        </div>
      </div>

      {step === 1 ? (
        // Step 1: Select Members
        <>
          {/* Search */}
          <div className="px-3 py-2 bg-[#111b21]">
            <div className="bg-[#202c33] rounded-lg flex items-center px-4 py-[7px] gap-6">
              <Search className="w-[18px] h-[18px] text-[#8696a0]" />
              <input 
                placeholder="Search contacts"
                className="flex-1 bg-transparent text-[#d1d7db] text-[15px] outline-none placeholder-[#8696a0]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Selected Members Pills */}
          {selectedMembers.length > 0 && (
            <div className="px-4 py-2 flex flex-wrap gap-2 bg-[#111b21] border-b border-[#2a3942]">
              {selectedMembers.map(memberId => {
                const contact = contacts.find(c => c.contact_id === memberId);
                return (
                  <div
                    key={memberId}
                    onClick={() => toggleMember(memberId)}
                    className="flex items-center gap-2 bg-[#202c33] pl-1 pr-3 py-1 rounded-full cursor-pointer hover:bg-[#2a3942]"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-xs font-medium">
                      {contact?.display_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[#e9edef] text-sm">{contact?.display_name}</span>
                    <X className="w-4 h-4 text-[#8696a0]" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => toggleMember(contact.contact_id)}
                className="flex items-center px-4 py-3 cursor-pointer hover:bg-[#202c33] transition-all"
              >
                <div className="relative">
                  <div className="w-[49px] h-[49px] rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-lg font-medium">
                    {contact.display_name?.charAt(0).toUpperCase()}
                  </div>
                  {selectedMembers.includes(contact.contact_id) && (
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center border-2 border-[#111b21]">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 ml-[15px] border-b border-[#222d34] py-[14px] -my-3">
                  <h3 className="text-white text-[17px] truncate">{contact.display_name}</h3>
                  <p className="text-[#8696a0] text-[13px] truncate mt-0.5">
                    {contact.user?.bio || contact.phone}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Next Button */}
          {selectedMembers.length > 0 && (
            <div className="p-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-lg hover:bg-[#06cf9c] transition-all"
              >
                <Check className="w-6 h-6" />
              </button>
            </div>
          )}
        </>
      ) : (
        // Step 2: Group Info
        <>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Group Avatar */}
            <div className="flex justify-center py-8">
              <div className="relative group cursor-pointer">
                <div className="w-[200px] h-[200px] rounded-full bg-[#202c33] flex items-center justify-center">
                  <Users className="w-24 h-24 text-[#8696a0]" />
                </div>
                <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white mb-2" />
                  <span className="text-white text-xs text-center px-4">ADD GROUP ICON</span>
                </div>
              </div>
            </div>

            {/* Group Name */}
            <div className="px-8">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (required)"
                className="w-full bg-transparent text-[#e9edef] text-[17px] border-b-2 border-[#00a884] pb-3 outline-none placeholder:text-[#8696a0]"
                maxLength={50}
              />
              <p className="text-right text-[#8696a0] text-xs mt-2">{50 - groupName.length}</p>
            </div>

            {/* Group Description */}
            <div className="px-8 mt-6">
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Group description (optional)"
                className="w-full bg-transparent text-[#e9edef] text-[15px] border-b border-[#2a3942] pb-3 outline-none placeholder:text-[#8696a0] resize-none"
                rows={2}
                maxLength={100}
              />
            </div>

            {/* Selected Members Preview */}
            <div className="px-8 mt-8">
              <p className="text-[#00a884] text-xs uppercase tracking-wider mb-4">
                Members: {selectedMembers.length}
              </p>
              <div className="flex flex-wrap gap-4">
                {selectedMembers.map(memberId => {
                  const contact = contacts.find(c => c.contact_id === memberId);
                  return (
                    <div key={memberId} className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-xl font-medium">
                        {contact?.display_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[#8696a0] text-xs mt-1 max-w-[60px] truncate">
                        {contact?.display_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Create Button */}
          <div className="p-4 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={!groupName.trim() || creating}
              className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-lg hover:bg-[#06cf9c] transition-all disabled:opacity-50"
            >
              {creating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-6 h-6" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
