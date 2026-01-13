"use client";

import { useRef, useState, useCallback, useEffect } from 'react';
import { soundManager } from './sounds';

interface UseWebRTCProps {
  ws: WebSocket | null;
  userId: string;
  userName: string;
}

interface CallState {
  isInCall: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  isConnected: boolean;
  callType: 'audio' | 'video';
  remoteUserId: string;
  remoteUserName: string;
  callId: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useWebRTC({ ws, userId, userName }: UseWebRTCProps) {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isIncoming: false,
    isOutgoing: false,
    isConnected: false,
    callType: 'audio',
    remoteUserId: '',
    remoteUserName: '',
    callId: '',
  });

  const [localVideoRef, setLocalVideoRef] = useState<HTMLVideoElement | null>(null);
  const [remoteVideoRef, setRemoteVideoRef] = useState<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Generate unique call ID
  const generateCallId = () => `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Clean up WebRTC resources
  const cleanup = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    remoteStream.current = null;
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
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ice_candidate',
          to_id: callState.remoteUserId,
          candidate: JSON.stringify(event.candidate),
          call_id: callState.callId,
        }));
      }
    };

    pc.ontrack = (event) => {
      remoteStream.current = event.streams[0];
      if (remoteVideoRef) {
        remoteVideoRef.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        soundManager.stopDialingTone();
        soundManager.stopRingtone();
        soundManager.playCallConnected();
        setCallState(prev => ({ ...prev, isConnected: true, isOutgoing: false, isIncoming: false }));
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        soundManager.playCallEnded();
        cleanup();
      }
    };

    return pc;
  }, [ws, callState.remoteUserId, callState.callId, remoteVideoRef, cleanup]);

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
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video',
      };
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (localVideoRef && type === 'video') {
        localVideoRef.srcObject = localStream.current;
      }

      // Create peer connection
      peerConnection.current = createPeerConnection();
      
      // Add local tracks
      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });

      // Create and send offer
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      ws.send(JSON.stringify({
        type: 'call_offer',
        to_id: targetUserId,
        from_name: userName,
        call_type: type,
        sdp: JSON.stringify(offer),
        call_id: callId,
      }));
    } catch (error) {
      console.error('Error starting call:', error);
      cleanup();
    }
  }, [ws, userName, localVideoRef, createPeerConnection, cleanup]);

  // Answer an incoming call
  const answerCall = useCallback(async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !callState.isIncoming) return;

    soundManager.stopRingtone();

    try {
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callState.callType === 'video',
      };
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (localVideoRef && callState.callType === 'video') {
        localVideoRef.srcObject = localStream.current;
      }

      // Add local tracks
      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });

      // Create and send answer
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
      cleanup();
    }
  }, [ws, callState, localVideoRef, cleanup]);

  // Reject/End call
  const endCall = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN && callState.remoteUserId) {
      ws.send(JSON.stringify({
        type: callState.isIncoming ? 'call_reject' : 'call_end',
        to_id: callState.remoteUserId,
        call_id: callState.callId,
      }));
    }
    soundManager.playCallEnded();
    cleanup();
  }, [ws, callState, cleanup]);

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

  // Handle incoming WebRTC signaling messages
  const handleSignalingMessage = useCallback(async (data: any) => {
    switch (data.type) {
      case 'call_offer':
        // Incoming call
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

        // Create peer connection and set remote description
        peerConnection.current = createPeerConnection();
        const offer = JSON.parse(data.sdp);
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        break;

      case 'call_answer':
        // Call was answered
        if (peerConnection.current && data.call_id === callState.callId) {
          soundManager.stopDialingTone();
          const answer = JSON.parse(data.sdp);
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
        break;

      case 'ice_candidate':
        // ICE candidate received
        if (peerConnection.current && data.call_id === callState.callId) {
          const candidate = JSON.parse(data.candidate);
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        break;

      case 'call_end':
      case 'call_reject':
        // Call ended or rejected
        soundManager.playCallEnded();
        cleanup();
        break;
    }
  }, [callState.callId, createPeerConnection, cleanup]);

  return {
    callState,
    localStream: localStream.current,
    remoteStream: remoteStream.current,
    isMuted,
    isVideoOff,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    handleSignalingMessage,
    setLocalVideoRef,
    setRemoteVideoRef,
  };
}
