"use client";

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import axios from 'axios';
import { X, Camera, Check, ArrowLeft, Pencil } from 'lucide-react';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const { user, updateProfile } = useStore();
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [name, setName] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async (field: 'username' | 'bio') => {
    if (!user) return;
    setSaving(true);
    try {
      const updates = field === 'username' ? { username: name } : { bio };
      await axios.put('http://localhost:8080/api/profile', updates, {
        headers: { 'user_id': user.id }
      });
      updateProfile(updates);
      if (field === 'username') setEditingName(false);
      else setEditingBio(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#111b21] flex flex-col animate-slide-in overflow-hidden">
      {/* Header */}
      <div className="h-[60px] bg-[#202c33] flex items-center px-6 shrink-0 border-b border-[#2a3942]/30">
        <div className="flex items-center gap-5">
          <ArrowLeft 
            className="w-5 h-5 text-[#d9dee0] cursor-pointer hover:text-white transition-all" 
            onClick={onClose}
          />
          <h2 className="text-[17px] font-medium text-white">Profile</h2>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Avatar Section */}
        <div className="flex justify-center py-7">
          <div className="relative group cursor-pointer">
            <div className="w-[150px] h-[150px] rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-6xl font-light shadow-xl shadow-[#00a884]/10">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white mb-2" />
              <span className="text-white text-xs text-center px-4">CHANGE PROFILE PHOTO</span>
            </div>
          </div>
        </div>

        {/* Name Section */}
        <div className="px-8 py-5 bg-[#111b21]">
          <label className="text-[#00a884] text-[12px] uppercase tracking-wider font-medium">Your Name</label>
          <div className="flex items-center justify-between mt-4">
            {editingName ? (
              <div className="flex-1 flex items-center gap-4">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-transparent text-[#e9edef] text-[17px] border-b-2 border-[#00a884] pb-2 outline-none"
                  autoFocus
                  maxLength={25}
                />
                <span className="text-[#8696a0] text-sm">{25 - name.length}</span>
                <button 
                  onClick={() => handleSave('username')}
                  disabled={saving || !name.trim()}
                  className="text-[#00a884] hover:text-[#06cf9c] disabled:opacity-50"
                >
                  <Check className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-[#e9edef] text-[17px]">{user?.username}</span>
                <button 
                  onClick={() => { setEditingName(true); setName(user?.username || ''); }}
                  className="text-[#8696a0] hover:text-[#00a884]"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          <p className="text-[#8696a0] text-[13px] mt-4 leading-5">
            This is not your username or pin. This name will be visible to your ChatterBox contacts.
          </p>
        </div>

        <div className="h-2.5 bg-[#0b141a]" />

        {/* About/Bio Section */}
        <div className="px-8 py-5 bg-[#111b21]">
          <label className="text-[#00a884] text-[12px] uppercase tracking-wider font-medium">About</label>
          <div className="flex items-center justify-between mt-4">
            {editingBio ? (
              <div className="flex-1 flex items-start gap-4">
                <textarea
                  ref={bioInputRef}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="flex-1 bg-transparent text-[#e9edef] text-[17px] border-b-2 border-[#00a884] pb-2 outline-none resize-none"
                  autoFocus
                  rows={2}
                  maxLength={140}
                />
                <span className="text-[#8696a0] text-sm">{140 - bio.length}</span>
                <button 
                  onClick={() => handleSave('bio')}
                  disabled={saving}
                  className="text-[#00a884] hover:text-[#06cf9c] disabled:opacity-50"
                >
                  <Check className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-[#e9edef] text-[17px]">{user?.bio || 'Hey there! I am using ChatterBox'}</span>
                <button 
                  onClick={() => { setEditingBio(true); setBio(user?.bio || ''); }}
                  className="text-[#8696a0] hover:text-[#00a884]"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="h-2.5 bg-[#0b141a]" />

        {/* Phone Section */}
        <div className="px-8 py-5 bg-[#111b21]">
          <label className="text-[#00a884] text-[12px] uppercase tracking-wider font-medium">Phone</label>
          <div className="mt-4">
            <span className="text-[#e9edef] text-[17px]">{user?.phone}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
