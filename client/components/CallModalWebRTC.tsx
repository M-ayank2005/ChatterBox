"use client";

import { useRef, useEffect } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  callState: {
    isInCall: boolean;
    isIncoming: boolean;
    isOutgoing: boolean;
    isConnected: boolean;
    callType: 'audio' | 'video';
    remoteUserId: string;
    remoteUserName: string;
    callId: string;
  };
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  onAnswer: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export default function CallModalWebRTC({ 
  isOpen,
  callState,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  callDuration,
  onAnswer,
  onEnd,
  onToggleMute,
  onToggleVideo,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !callState.isInCall) return null;

  const getStatusText = () => {
    if (callState.isIncoming) return 'Incoming call...';
    if (callState.isOutgoing) return 'Calling...';
    if (callState.isConnected) return formatDuration(callDuration);
    return 'Connecting...';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#111b21] flex flex-col items-center justify-between py-12">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#00a884]/20 to-transparent pointer-events-none" />
      
      {/* Top Section - User Info */}
      <div className="relative z-10 text-center">
        {!callState.isConnected || callState.callType === 'audio' ? (
          <>
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-5xl font-light mx-auto mb-6 shadow-2xl animate-pulse">
              {callState.remoteUserName?.charAt(0).toUpperCase() || '?'}
            </div>
            <h2 className="text-white text-2xl font-light mb-2">{callState.remoteUserName || 'Unknown'}</h2>
          </>
        ) : null}
        <p className="text-[#8696a0] text-sm">
          {getStatusText()}
        </p>
        <p className="text-[#00a884] text-xs mt-1 uppercase tracking-wider">
          {callState.callType === 'video' ? 'Video Call' : 'Voice Call'}
        </p>
      </div>

      {/* Video Preview (for video calls when connected) */}
      {callState.callType === 'video' && callState.isConnected && (
        <div className="relative z-10 flex-1 flex items-center justify-center my-8 w-full px-4">
          {/* Remote video (full size) */}
          <div className="relative w-full max-w-[600px] aspect-video bg-[#2a3942] rounded-2xl overflow-hidden">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-4xl">
                  {callState.remoteUserName?.charAt(0).toUpperCase() || '?'}
                </div>
              </div>
            )}
            
            {/* Local video (picture in picture) */}
            <div className="absolute bottom-4 right-4 w-32 h-24 bg-[#374248] rounded-lg overflow-hidden shadow-lg">
              {localStream && !isVideoOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-[#8696a0]" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audio call - show pulsing avatar when connected */}
      {callState.callType === 'audio' && callState.isConnected && (
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#00a884]/20 animate-ping" />
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#00a884] to-[#02735e] flex items-center justify-center text-white text-6xl font-light shadow-2xl relative">
              {callState.remoteUserName?.charAt(0).toUpperCase() || '?'}
            </div>
          </div>
        </div>
      )}

      {/* Call Controls */}
      <div className="relative z-10">
        {callState.isIncoming ? (
          // Incoming call - Accept/Reject
          <div className="flex items-center gap-8">
            <button
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-all transform hover:scale-105"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <button
              onClick={onAnswer}
              className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-lg hover:bg-[#06cf9c] transition-all transform hover:scale-105 animate-pulse"
            >
              {callState.callType === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </button>
          </div>
        ) : callState.isConnected ? (
          // Connected - Mute, Video Toggle, End
          <div className="flex items-center gap-6">
            <button
              onClick={onToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isMuted ? 'bg-white text-[#111b21]' : 'bg-[#2a3942] text-white hover:bg-[#374248]'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            
            {callState.callType === 'video' && (
              <button
                onClick={onToggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isVideoOff ? 'bg-white text-[#111b21]' : 'bg-[#2a3942] text-white hover:bg-[#374248]'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}
            
            <button
              onClick={onEnd}
              className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-all"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        ) : (
          // Outgoing call - just End button
          <div className="flex items-center justify-center">
            <button
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-all"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        )}
      </div>

      {/* Encrypted indicator */}
      <div className="relative z-10 mt-8 flex items-center gap-2 text-[#8696a0] text-xs">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
        <span>End-to-end encrypted</span>
      </div>

      {/* CSS for mirror effect on local video */}
      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
