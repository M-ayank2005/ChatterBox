"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { soundManager } from '@/lib/sounds';
import ChatSidebar from '@/components/ChatSidebar';
import ChatWindow from '@/components/ChatWindow';
import ResizablePanel from '@/components/ResizablePanel';
import CallModalWebRTC from '@/components/CallModalWebRTC';

// ICE Servers for WebRTC
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function ChatPage() {
  const { user, token, addMessage, setTypingUser, setOnlineUser, updateMessageStatus } = useStore();
  const router = useRouter();
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Ref to hold latest message handler to avoid stale closure
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  
  // WebRTC state
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const callDurationInterval = useRef<NodeJS.Timeout | null>(null);
  
  const [callState, setCallState] = useState({
    isInCall: false,
    isIncoming: false,
    isOutgoing: false,
    isConnected: false,
    callType: 'audio' as 'audio' | 'video',
    remoteUserId: '',
    remoteUserName: '',
    callId: '',
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Generate unique call ID
  const generateCallId = () => `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Cleanup WebRTC resources
  const cleanupCall = useCallback(() => {
    if (callDurationInterval.current) {
      clearInterval(callDurationInterval.current);
      callDurationInterval.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
      setLocalStreamState(null);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    remoteStream.current = null;
    setRemoteStreamState(null);
    soundManager.stopDialingTone();
    soundManager.stopRingtone();
    setCallState({
      isInCall: false,
      isIncoming: false,
      isOutgoing: false,
      isConnected: false,
      callType: 'audio',
      remoteUserId: '',
      remoteUserName: '',
      callId: '',
    });
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((remoteUserId: string, callId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ice_candidate',
          to_id: remoteUserId,
          candidate: JSON.stringify(event.candidate),
          call_id: callId,
        }));
      }
    };

    pc.ontrack = (event) => {
      remoteStream.current = event.streams[0];
      setRemoteStreamState(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        soundManager.stopDialingTone();
        soundManager.stopRingtone();
        soundManager.playCallConnected();
        setCallState(prev => ({ ...prev, isConnected: true, isOutgoing: false, isIncoming: false }));
        // Start call duration timer
        callDurationInterval.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        soundManager.playCallEnded();
        cleanupCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [ws, cleanupCall]);

  // Start a call
  const startCall = useCallback(async (targetUserId: string, targetUserName: string, type: 'audio' | 'video') => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const callId = generateCallId();
    
    setCallState({
      isInCall: true,
      isIncoming: false,
      isOutgoing: true,
      isConnected: false,
      callType: type,
      remoteUserId: targetUserId,
      remoteUserName: targetUserName,
      callId,
    });

    soundManager.startDialingTone();

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video',
      };
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStreamState(localStream.current);

      const pc = createPeerConnection(targetUserId, callId);
      
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current!);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ws.send(JSON.stringify({
        type: 'call_offer',
        to_id: targetUserId,
        from_name: user?.username || 'User',
        call_type: type,
        sdp: JSON.stringify(offer),
        call_id: callId,
      }));
    } catch (error) {
      console.error('Error starting call:', error);
      cleanupCall();
    }
  }, [ws, user, createPeerConnection, cleanupCall]);

  // Answer an incoming call
  const answerCall = useCallback(async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !callState.isIncoming) return;

    soundManager.stopRingtone();

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callState.callType === 'video',
      };
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStreamState(localStream.current);

      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });

      const answer = await peerConnection.current?.createAnswer();
      await peerConnection.current?.setLocalDescription(answer);

      ws.send(JSON.stringify({
        type: 'call_answer',
        to_id: callState.remoteUserId,
        sdp: JSON.stringify(answer),
        call_id: callState.callId,
      }));

      setCallState(prev => ({ ...prev, isIncoming: false }));
    } catch (error) {
      console.error('Error answering call:', error);
      cleanupCall();
    }
  }, [ws, callState, cleanupCall]);

  // End call
  const endCall = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN && callState.remoteUserId) {
      ws.send(JSON.stringify({
        type: callState.isIncoming ? 'call_reject' : 'call_end',
        to_id: callState.remoteUserId,
        call_id: callState.callId,
      }));
    }
    soundManager.playCallEnded();
    cleanupCall();
  }, [ws, callState, cleanupCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
    console.log('📨 Raw WebSocket data:', event.data);
    if (event.data && event.data.trim()) {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Parsed message:', data);
        
        switch (data.type) {
          case 'typing':
            setTypingUser(data.from_id, data.is_typing);
            break;
          case 'presence':
            setOnlineUser(data.user_id, data.status === 'online');
            break;
          case 'read_receipt':
            updateMessageStatus(data.message_ids, 'read');
            break;
          case 'message':
            const message = {
              message_id: data.message_id,
              chat_id: data.chat_id,
              sender_id: data.sender_id,
              receiver_id: data.receiver_id,
              content: data.content,
              type: data.msg_type || 'text',
              status: data.status || 'sent',
              reply_to: data.reply_to,
              reply_text: data.reply_text,
              created_at: data.created_at || new Date().toISOString(),
            };
            addMessage(message);
            if (data.sender_id !== user?.id) {
              soundManager.playMessageReceived();
            }
            break;
            
          // WebRTC Call signaling
          case 'call_offer':
            console.log('📞 Incoming call from:', data.from_name);
            soundManager.startRingtone();
            
            setCallState({
              isInCall: true,
              isIncoming: true,
              isOutgoing: false,
              isConnected: false,
              callType: data.call_type,
              remoteUserId: data.from_id,
              remoteUserName: data.from_name || 'Unknown',
              callId: data.call_id,
            });

            const pc = createPeerConnection(data.from_id, data.call_id);
            const offer = JSON.parse(data.sdp);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            break;

          case 'call_answer':
            console.log('📞 Call answered');
            if (peerConnection.current && data.call_id === callState.callId) {
              soundManager.stopDialingTone();
              const answer = JSON.parse(data.sdp);
              await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
            }
            break;

          case 'ice_candidate':
            if (peerConnection.current) {
              const candidate = JSON.parse(data.candidate);
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            break;

          case 'call_end':
          case 'call_reject':
            console.log('📞 Call ended/rejected');
            soundManager.playCallEnded();
            cleanupCall();
            break;
            
          default:
            console.log('❓ Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    }
  }, [addMessage, setTypingUser, setOnlineUser, updateMessageStatus, user, callState.callId, createPeerConnection, cleanupCall]);

  // Keep messageHandlerRef always up-to-date
  useEffect(() => {
    messageHandlerRef.current = handleWebSocketMessage;
  }, [handleWebSocketMessage]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (user && !ws) {
      const wsUrl = `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8080/ws?user_id=${user.id}`;
      console.log('Connecting to WebSocket:', wsUrl);
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('✅ Connected to WebSocket');
        socket.send(JSON.stringify({
          type: 'presence',
          user_id: user.id,
          status: 'online'
        }));
      };
      
      // Use a wrapper that calls the ref to avoid stale closure
      socket.onmessage = (event) => {
        if (messageHandlerRef.current) {
          messageHandlerRef.current(event);
        }
      };
      
      socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
      
      socket.onclose = (event) => {
        console.log('🔌 Disconnected from WebSocket');
      };
      
      setWs(socket);
      
      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'presence',
            user_id: user.id,
            status: 'offline'
          }));
          socket.close();
        }
      };
    }
  }, [user, ws]);

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-white">
      <ResizablePanel minWidth={280} maxWidth={600} defaultWidth={400}>
        <ChatSidebar />
      </ResizablePanel>
      <ChatWindow ws={ws} onStartCall={startCall} />
      
      {/* WebRTC Call Modal */}
      <CallModalWebRTC
        isOpen={callState.isInCall}
        callState={callState}
        localStream={localStreamState}
        remoteStream={remoteStreamState}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        callDuration={callDuration}
        onAnswer={answerCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
      />
    </div>
  );
}
