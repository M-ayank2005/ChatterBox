"use client";

import { useState } from 'react';
import { X } from 'lucide-react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
  'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Objects': ['📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💿', '📷', '📹', '🎥', '📞', '☎️', '📺', '📻', '🎙️', '⏰', '⌚', '💡', '🔦', '🕯️', '💰', '💳', '💎', '🔑', '🗝️', '🔒', '🔓'],
  'Symbols': ['✅', '❌', '❓', '❗', '💯', '🔥', '⭐', '🌟', '✨', '💫', '💥', '💢', '💤', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '🔔', '🔕', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱']
};

export default function EmojiPicker({ isOpen, onClose, onSelect }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState('Smileys');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const categories = Object.keys(EMOJI_CATEGORIES);
  const emojis = EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES];

  return (
    <div className="absolute bottom-16 left-0 w-[340px] h-[320px] bg-[#202c33] rounded-lg shadow-2xl border border-[#2a3942] flex flex-col animate-slide-in z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a3942]">
        <input
          type="text"
          placeholder="Search emoji"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-[#2a3942] text-[#e9edef] text-sm px-3 py-1.5 rounded-lg outline-none placeholder:text-[#8696a0]"
        />
        <button onClick={onClose} className="ml-2 text-[#8696a0] hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 px-2 py-2 border-b border-[#2a3942] overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-[#00a884] text-white'
                : 'text-[#8696a0] hover:bg-[#2a3942]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="grid grid-cols-8 gap-1">
          {emojis
            .filter(emoji => !searchQuery || emoji.includes(searchQuery))
            .map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelect(emoji);
                }}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-[#2a3942] rounded transition-all"
              >
                {emoji}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
