"use client";

import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  callerName: string;
  isIncoming?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}

export default function CallModal({ 
  isOpen, 
  onClose, 
  callType, 
  callerName, 
  isIncoming = false,
  onAccept,
  onReject 
}: CallModalProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');

  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      setCallStatus('ringing');
      return;
    }

    if (callStatus === 'connected') {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    setCallStatus('connected');
    onAccept?.();
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#111b21] flex flex-col items-center justify-between py-12">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#00a884]/20 to-transparent" />
      
      {/* Top Section - User Info */}
      <div className="relative z-10 text-center">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-5xl font-light mx-auto mb-6 shadow-2xl">
          {callerName.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-white text-2xl font-light mb-2">{callerName}</h2>
        <p className="text-[#8696a0] text-sm">
          {callStatus === 'ringing' && (isIncoming ? 'Incoming call...' : 'Calling...')}
          {callStatus === 'connected' && formatDuration(callDuration)}
          {callStatus === 'ended' && 'Call ended'}
        </p>
        <p className="text-[#00a884] text-xs mt-1 uppercase tracking-wider">
          {callType === 'video' ? 'Video Call' : 'Voice Call'}
        </p>
      </div>

      {/* Video Preview (for video calls) */}
      {callType === 'video' && callStatus === 'connected' && (
        <div className="relative z-10 flex-1 flex items-center justify-center my-8">
          <div className="w-[300px] h-[200px] bg-[#2a3942] rounded-2xl flex items-center justify-center">
            {isVideoOff ? (
              <VideoOff className="w-16 h-16 text-[#8696a0]" />
            ) : (
              <span className="text-[#8696a0]">Camera Preview</span>
            )}
          </div>
          {/* Self view */}
          <div className="absolute bottom-4 right-4 w-24 h-32 bg-[#374248] rounded-lg flex items-center justify-center">
            <span className="text-[#8696a0] text-xs">You</span>
          </div>
        </div>
      )}

      {/* Call Controls */}
      <div className="relative z-10">
        {isIncoming && callStatus === 'ringing' ? (
          // Incoming call - Accept/Reject
          <div className="flex items-center gap-8">
            <button
              onClick={() => { onReject?.(); onClose(); }}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-all"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-lg hover:bg-[#06cf9c] transition-all"
            >
              {callType === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </button>
          </div>
        ) : callStatus === 'connected' ? (
          // Connected - Mute, Video Toggle, End
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isMuted ? 'bg-white text-[#111b21]' : 'bg-[#2a3942] text-white hover:bg-[#374248]'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            
            {callType === 'video' && (
              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isVideoOff ? 'bg-white text-[#111b21]' : 'bg-[#2a3942] text-white hover:bg-[#374248]'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}
            
            <button
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-all"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        ) : (
          // Outgoing ringing - End call only
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-all"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* End-to-end encrypted notice */}
      <p className="relative z-10 text-[#8696a0] text-xs flex items-center gap-2 mt-8">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
        End-to-end encrypted
      </p>
    </div>
  );
}
