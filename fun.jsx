import React from 'react'
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Add this after ICE_SERVERS constant
const BORDER_COLORS = [
  '#7986cb', // Blue
  '#e57373', // Red
  '#81c784', // Green
  '#ffd54f', // Yellow
  '#ba68c8', // Purple
  '#4fc3f7', // Light Blue
  '#f06292', // Pink
  '#4db6ac', // Teal
  '#ff8a65', // Orange
];

const getRandomColor = () => {
  return BORDER_COLORS[Math.floor(Math.random() * BORDER_COLORS.length)];
};

// Add SVG icons for buttons
const Icons = {
  micOn: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
  ),
  micOff: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9l4.19 4.18 1.27-1.27L4.27 3z"/>
    </svg>
  ),
  videoOn: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  ),
  videoOff: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
    </svg>
  )
};

// Add styles directly in the component


function App() {
  const localVideoRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);
  const socketInitializedRef = useRef(false);
  const [userColors, setUserColors] = useState({});
  const [userMediaState, setUserMediaState] = useState({
    [socketRef.current?.id]: { audio: true, video: true }
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const iceCandidateQueueRef = useRef({});

  const styles = {
    container: {
      minHeight: '100vh',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#202124',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    header: {
      position: 'fixed',
      top: '16px',
      left: '16px',
      zIndex: 10,
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
      padding: '16px',
      borderRadius: '8px',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      color: 'rgba(255, 255, 255, 0.95)',
    },
    participantCount: {
      fontSize: '0.875rem',
      color: 'rgba(255, 255, 255, 0.7)',
    },
    gridContainer: {
      display: 'grid',
      gap: '4px',
      padding: '4px',
      width: '100%',
      height: '100vh',
      boxSizing: 'border-box',
      alignContent: 'center',
      justifyContent: 'center',
      gridAutoRows: '1fr',
      position: 'relative',
    },
    videoContainer: {
      position: 'relative',
      backgroundColor: '#3c4043',
      borderRadius: '12px',
      overflow: 'hidden',
      width: '100%',
      height: '100%',
      border: '2px solid transparent',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      backgroundColor: '#202124',
    },
    controlsBar: {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '16px',
      backgroundColor: 'rgba(32, 33, 36, 0.8)',
      padding: '12px 24px',
      borderRadius: '40px',
      zIndex: 1000,
    },
    controlButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: 'none',
      borderRadius: '50%',
      width: '48px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'white',
      transition: 'all 0.2s ease',
    },
    controlButtonOff: {
      backgroundColor: '#ea4335',
    },
    nameTag: {
      position: 'absolute',
      bottom: '70px', // Updated to make room for controls
      left: '12px',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.875rem',
      fontWeight: '500',
    },
    chatButtonContainer: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      opacity: isChatOpen ? 0 : 1,
      visibility: isChatOpen ? 'hidden' : 'visible',
      transition: 'opacity 0.3s ease, visibility 0.3s ease',
    },
    chatButton: {
      backgroundColor: '#3c4043',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '48px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    },
    notificationBadge: {
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      backgroundColor: '#ea4335',
      color: 'white',
      borderRadius: '50%',
      minWidth: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      padding: '0 4px',
      animation: 'pulse 2s infinite',
    },
    '@keyframes pulse': {
      '0%': {
        transform: 'scale(1)',
      },
      '50%': {
        transform: 'scale(1.1)',
      },
      '100%': {
        transform: 'scale(1)',
      },
    },
    chatContainer: {
      position: 'fixed',
      right: isChatOpen ? '0' : '-400px',
      top: '0',
      width: '400px',
      height: '100vh',
      backgroundColor: '#202124',
      transition: 'right 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 999,
    },
    chatHeader: {
      padding: '16px',
      borderBottom: '1px solid #3c4043',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chatTitle: {
      color: 'white',
      fontSize: '1.2rem',
      fontWeight: 'bold',
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      fontSize: '1.5rem',
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px',
    },
    message: {
      marginBottom: '12px',
      padding: '8px 12px',
      borderRadius: '8px',
      maxWidth: '80%',
      wordBreak: 'break-word',
    },
    ownMessage: {
      backgroundColor: '#3c4043',
      color: 'white',
      marginLeft: 'auto',
    },
    otherMessage: {
      backgroundColor: '#5f6368',
      color: 'white',
    },
    messageSender: {
      fontSize: '0.8rem',
      color: '#9aa0a6',
      marginBottom: '4px',
    },
    messageInputContainer: {
      padding: '16px',
      borderTop: '1px solid #3c4043',
      display: 'flex',
      gap: '8px',
    },
    messageInput: {
      flex: 1,
      backgroundColor: '#3c4043',
      border: 'none',
      borderRadius: '20px',
      padding: '12px 16px',
      color: 'white',
      outline: 'none',
    },
    sendButton: {
      backgroundColor: '#8ab4f8',
      color: 'black',
      border: 'none',
      borderRadius: '20px',
      padding: '12px 16px',
      cursor: 'pointer',
      fontWeight: 'bold',
    },
  };

  useEffect(() => {
    // Prevent duplicate initializations
    if (socketInitializedRef.current) {
      console.log("Socket already initialized, skipping re-initialization");
      return;
    }
    
    socketInitializedRef.current = true;
    console.log("Initializing socket and WebRTC connections");
    
    // Initialize socket connection
    socketRef.current = io("wss://acn-webrtc-signaling-server-prod.onrender.com", {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        timeout: 5000,
    });
    
    const createPeerConnection = (userSocketId) => {
      // Check if connection already exists
      if (peerConnectionsRef.current[userSocketId]) {
        console.log(`PeerConnection already exists for ${userSocketId}, reusing`);
        return peerConnectionsRef.current[userSocketId];
      }
      
      console.log(`Creating new peer connection for ${userSocketId}`);
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Handle ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current.emit("candidate", { 
            candidate: e.candidate, 
            target: userSocketId 
          });
        }
      };

      // Connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${userSocketId}: ${pc.connectionState}`);
        if (pc.connectionState === "disconnected" || 
            pc.connectionState === "closed" || 
            pc.connectionState === "failed") {
          cleanupPeerConnection(userSocketId);
        }
      };

      // Handle incoming tracks (remote video)
      pc.ontrack = (ev) => {
        console.log(`Received track from ${userSocketId}:`, ev.track.kind);
        if (ev.streams && ev.streams[0]) {
          const stream = ev.streams[0];
          // Ensure video track is enabled
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = true;
          }
          // Ensure audio track is enabled
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = true;
          }
          
          setRemoteStreams(prev => {
            const newStreams = { ...prev };
            newStreams[userSocketId] = stream;
            return newStreams;
          });

          // Process any queued ICE candidates
          const queuedCandidates = iceCandidateQueueRef.current[userSocketId] || [];
          queuedCandidates.forEach(candidate => {
            try {
              pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              console.error(`Error adding queued ICE candidate for ${userSocketId}:`, error);
            }
          });
          // Clear the queue
          iceCandidateQueueRef.current[userSocketId] = [];
        }
      };

      // Add local tracks to the connection if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Store the peer connection
      peerConnectionsRef.current[userSocketId] = pc;
      return pc;
    };

    const cleanupPeerConnection = (userSocketId) => {
      console.log(`Cleaning up peer connection for ${userSocketId}`);
      const pc = peerConnectionsRef.current[userSocketId];
      if (pc) {
        // Remove all event handlers
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        
        // Close the connection
        pc.close();
        
        // Remove from our ref
        delete peerConnectionsRef.current[userSocketId];
        
        // Clear any queued ICE candidates
        delete iceCandidateQueueRef.current[userSocketId];
        
        // Remove stream from state
        setRemoteStreams(prev => {
          const newStreams = {...prev};
          delete newStreams[userSocketId];
          return newStreams;
        });
        
        console.log(`Connection for ${userSocketId} cleaned up`);
      }
    };

    const createOffer = async (userSocketId) => {
      try {
        // Skip if we already have a connection with this user
        if (peerConnectionsRef.current[userSocketId] && 
            peerConnectionsRef.current[userSocketId].iceConnectionState === "connected") {
          console.log(`Already connected to ${userSocketId}, skipping offer`);
          return;
        }
        
        const pc = createPeerConnection(userSocketId);
        const sdp = await pc.createOffer({ 
          offerToReceiveAudio: true, 
          offerToReceiveVideo: true 
        });
        await pc.setLocalDescription(sdp);
        socketRef.current.emit("offer", { sdp, target: userSocketId });
        console.log(`Offer sent to ${userSocketId}`);
      } catch (error) {
        console.error(`Error creating offer for ${userSocketId}:`, error);
      }
    };

    const createAnswer = async (sdp, sender) => {
      try {
        const pc = createPeerConnection(sender);
        await pc.setRemoteDescription(sdp);
        const answerSdp = await pc.createAnswer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true,
        });
        await pc.setLocalDescription(answerSdp);
        socketRef.current.emit("answer", { sdp: answerSdp, target: sender });
        console.log(`Answer sent to ${sender}`);
      } catch (error) {
        console.error(`Error creating answer for ${sender}:`, error);
      }
    };

    const handleOffer = async ({ sdp, sender }) => {
      console.log(`Received offer from ${sender}`);
      // make a rquest for media state
      // alert("requesting media");
      socketRef.current.emit("media_state_request", { target: sender });
      
      await createAnswer(sdp, sender);
    };

    const handleAnswer = async ({ sdp, sender }) => {
      console.log(`Received answer from ${sender}`);
      try {
        const pc = peerConnectionsRef.current[sender];
        if (pc && pc.signalingState !== "closed") {
          await pc.setRemoteDescription(sdp);
          console.log(`Set remote description for ${sender}`);
        } else {
          console.warn(`Cannot set remote description for ${sender}, invalid state:`, 
                       pc ? pc.signalingState : "no connection");
        }
      } catch (error) {
        console.error(`Error setting remote description for ${sender}:`, error);
      }
    };

    const handleCandidate = async ({ candidate, sender }) => {
      const pc = peerConnectionsRef.current[sender];
      if (!pc) {
        console.warn(`No peer connection for ${sender}`);
        return;
      }

      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`Added ICE candidate from ${sender}`);
        } catch (error) {
          console.error(`Error adding ICE candidate from ${sender}:`, error);
        }
      } else {
        // Queue the candidate if remote description is not set
        console.log(`Queueing ICE candidate for ${sender} until remote description is set`);
        if (!iceCandidateQueueRef.current[sender]) {
          iceCandidateQueueRef.current[sender] = [];
        }
        iceCandidateQueueRef.current[sender].push(candidate);
      }
    };

    // Socket event handlers - using unique function references with proper cleanup
    const handleRoomUsers = async (roomUsers) => {
      console.log("Users in room:", roomUsers);
      setUsers(roomUsers);
      
      // Assign colors to new users
      const newColors = { ...userColors };
      roomUsers.forEach(user => {
        if (!newColors[user.id]) {
          newColors[user.id] = getRandomColor();
        }
      });
      setUserColors(newColors);
      
      // Find users we don't have connections with yet
      for (let user of roomUsers) {
        if (user.id !== socketRef.current.id) {
          await createOffer(user.id);
        }
      }
      
      // Cleanup connections to users who left
      const currentUserIds = roomUsers.map(user => user.id);
      Object.keys(peerConnectionsRef.current).forEach(userId => {
        if (!currentUserIds.includes(userId)) {
          console.log(`User ${userId} is no longer in room, cleaning up`);
          cleanupPeerConnection(userId);
        }
      });

      // Request current media states from all existing users
      roomUsers.forEach(user => {
        if (user.id !== socketRef.current.id) {
          // alert("requesting media");
          socketRef.current.emit("media_state_request", { target: user.id });
        }
      });
    };

    const handleUserDisconnected = (userId) => {
      console.log(`User disconnected: ${userId}`);
      cleanupPeerConnection(userId);
      
      // Update users list
      setUsers(prev => prev.filter(user => user.id !== userId));
    };

    // Add new socket event listeners for media state changes
    socketRef.current.on("media_state_change", ({ sender, audio, video }) => {
      alert("Got media from: "+sender);
      setUserMediaState(prev => ({
        ...prev,
        [sender]: { audio, video }
      }));
    });

    // Set up socket event listeners
    socketRef.current.on("room_users", handleRoomUsers);
    socketRef.current.on("getOffer", handleOffer);
    socketRef.current.on("getAnswer", handleAnswer);
    socketRef.current.on("getCandidate", handleCandidate);
    socketRef.current.on("user_disconnected", handleUserDisconnected);

    // Get local media stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // Set local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        localStreamRef.current = stream;

        // Join the room
        socketRef.current.emit("join", { 
          room: "1234", 
          name: `User-${Math.floor(Math.random() * 1000)}` 
        });
        console.log("Joined room with local stream");
      })
      .catch((error) => {
        console.error("getUserMedia error:", error);
      });

    // Cleanup function
    return () => {
      console.log("Component unmounting, cleaning up WebRTC connections");
      socketInitializedRef.current = false;
      
      // Remove all socket listeners
      if (socketRef.current) {
        socketRef.current.off("room_users", handleRoomUsers);
        socketRef.current.off("getOffer", handleOffer);
        socketRef.current.off("getAnswer", handleAnswer);
        socketRef.current.off("getCandidate", handleCandidate);
        socketRef.current.off("user_disconnected", handleUserDisconnected);
      }
      
      // Close all peer connections
      Object.keys(peerConnectionsRef.current).forEach(cleanupPeerConnection);
      
      // Stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      socketRef.current?.off("media_state_change");
    };
  }, []); // Keep empty dependency array to run only once

  // Add new socket event listener for media state requests
  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on("media_state_request", ({ requesterid }) => {
      // Send current media state to the requester
      const currentState = userMediaState[socketRef.current.id] || { audio: true, video: true };
      // alert("sending media state to: "+sender);
      // alert("my id: "+socketRef.current.id);
      socketRef.current.emit("media_state_change", {
        userId: requesterid,
        senderid: socketRef.current.id,
        audio: currentState.audio,
        video: currentState.video
      });
    });

    return () => {
      socketRef.current.off("media_state_request");
    };
  }, [userMediaState]);

  // Get the number of videos to display (local + remotes)
  const totalVideos = 1 + Object.keys(remoteStreams).length;
  
  // Determine grid layout based on count
  const getGridStyle = () => {
    const baseStyle = {
      gridAutoRows: '1fr',
      alignItems: 'stretch',
      justifyContent: 'center',
    };

    if (totalVideos <= 1) {
      return {
        ...baseStyle,
        gridTemplateColumns: '1fr',
        padding: '24px',
      };
    }
    if (totalVideos === 2) {
      return {
        ...baseStyle,
        gridTemplateColumns: 'repeat(2, 1fr)',
        padding: '48px',
      };
    }
    if (totalVideos <= 4) {
      return {
        ...baseStyle,
        gridTemplateColumns: 'repeat(2, 1fr)',
        padding: '24px',
      };
    }
    if (totalVideos <= 6) {
      return {
        ...baseStyle,
        gridTemplateColumns: 'repeat(3, 1fr)',
        padding: '16px',
      };
    }
    if (totalVideos <= 9) {
      return {
        ...baseStyle,
        gridTemplateColumns: 'repeat(3, 1fr)',
        padding: '12px',
      };
    }
    return {
      ...baseStyle,
      gridTemplateColumns: 'repeat(4, 1fr)',
      padding: '8px',
    };
  };

  // Add this before the return statement
  const localUserColor = userColors[socketRef.current?.id] || getRandomColor();

  const toggleMedia = (type) => {
    if (!localStreamRef.current) return;

    const tracks = localStreamRef.current.getTracks();
    tracks.forEach(track => {
      if (track.kind === type) {
        track.enabled = !track.enabled;
        const newState = track.enabled;
        
        setUserMediaState(prev => {
          const currentState = prev[socketRef.current.id] || { audio: true, video: true };
          return {
            ...prev,
            [socketRef.current.id]: {
              ...currentState,
              [type]: newState
            }
          };
        });

        // Emit the state change to other users
        socketRef.current?.emit("media_state_change", {
          userId: "send_to_all",
          senderid: socketRef.current.id,
          audio: type === 'audio' ? newState : (userMediaState[socketRef.current.id]?.audio ?? true),
          video: type === 'video' ? newState : (userMediaState[socketRef.current.id]?.video ?? true)
        });
      }
    });
  };

  // Update chat message handling
  useEffect(() => {
    if (!socketRef.current) return;

    const handleChatMessage = ({ sender, message, senderName }) => {
      setMessages(prev => [...prev, { sender, message, senderName }]);
      // Increment unread count if chat is closed
      if (!isChatOpen) {
        setUnreadMessages(prev => prev + 1);
      }
      // Scroll to bottom when new message arrives
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };

    socketRef.current.on('chat_message', handleChatMessage);

    return () => {
      socketRef.current.off('chat_message', handleChatMessage);
    };
  }, [isChatOpen]); // Add isChatOpen to dependencies

  // Reset unread count when chat is opened
  useEffect(() => {
    if (isChatOpen) {
      setUnreadMessages(0);
    }
  }, [isChatOpen]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;

    const message = {
      sender: socketRef.current.id,
      message: newMessage.trim(),
      senderName: `User-${socketRef.current.id.slice(0, 6)}`,
    };

    socketRef.current.emit('chat_message', message);
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Scroll to bottom after sending
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>WebRTC Conference</h1>
        <div style={styles.participantCount}>
          Active participants: {totalVideos}
        </div>
      </div>
      
      <div style={{
        ...styles.gridContainer,
        ...getGridStyle(),
        marginRight: isChatOpen ? '400px' : '0',
        transition: 'margin-right 0.3s ease',
      }}>
        {/* Local video */}
        <div style={{
          ...styles.videoContainer,
          borderColor: localUserColor,
          boxShadow: `0 0 5px ${localUserColor}40`
        }}>
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            style={styles.video}
          />
          <div style={{
            ...styles.nameTag,
            backgroundColor: `${localUserColor}CC`
          }}>
            You (Local)
          </div>
        </div>
        
        {/* Remote videos */}
        {Object.entries(remoteStreams).map(([userId, stream]) => {
          const user = users.find(u => u.id === userId);
          const borderColor = userColors[userId] || getRandomColor();
          const mediaState = userMediaState[userId];

          return (
            <div key={userId} style={{
              ...styles.videoContainer,
              borderColor: borderColor,
              boxShadow: `0 0 5px ${borderColor}40`
            }}>
              <video 
                autoPlay 
                playsInline 
                style={{
                  ...styles.video,
                  display: mediaState?.video ? 'block' : 'none'
                }}
                ref={el => {
                  if (el) {
                    el.srcObject = stream;
                    // Ensure video track is enabled
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                      videoTrack.enabled = mediaState?.video ?? true;
                    }
                    // Ensure audio track is enabled
                    const audioTrack = stream.getAudioTracks()[0];
                    if (audioTrack) {
                      audioTrack.enabled = mediaState?.audio ?? true;
                    }
                  }
                }}
              />
              {!mediaState?.video && (
                <div style={{
                  ...styles.video,
                  backgroundColor: '#202124',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                }}>
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div style={{
                ...styles.nameTag,
                backgroundColor: `${borderColor}CC`
              }}>
                {user?.name || userId.substring(0, 6)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <button
          onClick={() => toggleMedia('audio')}
          style={{
            ...styles.controlButton,
            ...(userMediaState[socketRef.current?.id]?.audio === false && styles.controlButtonOff)
          }}
        >
          {userMediaState[socketRef.current?.id]?.audio ? Icons.micOn : Icons.micOff}
        </button>
        <button
          onClick={() => toggleMedia('video')}
          style={{
            ...styles.controlButton,
            ...(userMediaState[socketRef.current?.id]?.video === false && styles.controlButtonOff)
          }}
        >
          {userMediaState[socketRef.current?.id]?.video ? Icons.videoOn : Icons.videoOff}
        </button>
      </div>

      {/* Chat Button with Notification */}
      <div style={styles.chatButtonContainer}>
        <button 
          style={styles.chatButton}
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          💬
        </button>
        {unreadMessages > 0 && (
          <div style={styles.notificationBadge}>
            {unreadMessages}
          </div>
        )}
      </div>

      {/* Chat Component */}
      <div style={styles.chatContainer}>
        <div style={styles.chatHeader}>
          <div style={styles.chatTitle}>Chat</div>
          <button 
            style={styles.closeButton}
            onClick={() => setIsChatOpen(false)}
          >
            ×
          </button>
        </div>
        <div 
          style={styles.messagesContainer}
          ref={chatContainerRef}
        >
          {messages.map((msg, index) => (
            <div 
              key={index}
              style={{
                ...styles.message,
                ...(msg.sender === socketRef.current?.id ? styles.ownMessage : styles.otherMessage)
              }}
            >
              <div style={styles.messageSender}>
                {msg.senderName}
              </div>
              {msg.message}
            </div>
          ))}
        </div>
        <div style={styles.messageInputContainer}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            style={styles.messageInput}
          />
          <button 
            style={styles.sendButton}
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
