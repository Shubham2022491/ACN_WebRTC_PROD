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
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
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
  }
};

function App() {
  const localVideoRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);
  const socketInitializedRef = useRef(false);
  const [userColors, setUserColors] = useState({});
  const [userMediaState, setUserMediaState] = useState({});

  useEffect(() => {
    // Prevent duplicate initializations
    if (socketInitializedRef.current) {
      console.log("Socket already initialized, skipping re-initialization");
      return;
    }
    
    socketInitializedRef.current = true;
    console.log("Initializing socket and WebRTC connections");
    
    // Initialize socket connection
    socketRef.current = io("http://localhost:4000");
    
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
      pc.oniceconnectionstatechange = () => {
        console.log(`Connection state with ${userSocketId}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === "disconnected" || 
            pc.iceConnectionState === "closed" || 
            pc.iceConnectionState === "failed") {
          cleanupPeerConnection(userSocketId);
        }
      };

      // Handle incoming tracks (remote video)
      pc.ontrack = (ev) => {
        console.log(`Received track from ${userSocketId}`);
        setRemoteStreams(prev => ({
          ...prev,
          [userSocketId]: ev.streams[0]
        }));
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
        pc.oniceconnectionstatechange = null;
        
        // Close the connection
        pc.close();
        
        // Remove from our ref
        delete peerConnectionsRef.current[userSocketId];
        
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
        
        // Only set remote description if we're in a valid state
        if (pc.signalingState !== "closed") {
          await pc.setRemoteDescription(sdp);
          const answerSdp = await pc.createAnswer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });
          await pc.setLocalDescription(answerSdp);
          
          socketRef.current.emit("answer", { sdp: answerSdp, target: sender });
          console.log(`Answer sent to ${sender}`);
        } else {
          console.warn(`Peer connection to ${sender} is closed, cannot create answer`);
        }
      } catch (error) {
        console.error(`Error creating answer for ${sender}:`, error);
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
    };

    const handleOffer = async ({ sdp, sender }) => {
      console.log(`Received offer from ${sender}`);
      await createAnswer(sdp, sender);
    };

    const handleAnswer = async ({ sdp, sender }) => {
      const pc = peerConnectionsRef.current[sender];
      if (pc && pc.signalingState !== "closed" && pc.signalingState !== "stable") {
        try {
          await pc.setRemoteDescription(sdp);
          console.log(`Set remote description for ${sender}`);
        } catch (error) {
          console.error(`Error setting remote description for ${sender}:`, error);
        }
      } else {
        console.warn(`Cannot set remote description for ${sender}, invalid state:`, 
                     pc ? pc.signalingState : "no connection");
      }
    };

    const handleCandidate = async ({ candidate, sender }) => {
      const pc = peerConnectionsRef.current[sender];
      if (pc && pc.remoteDescription && pc.signalingState !== "closed") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`Added ICE candidate from ${sender}`);
        } catch (error) {
          console.error(`Error adding ICE candidate from ${sender}:`, error);
        }
      } else {
        console.warn(`Cannot add ICE candidate for ${sender}, invalid state or no remote description`);
      }
    };

    const handleUserDisconnected = (userId) => {
      console.log(`User disconnected: ${userId}`);
      cleanupPeerConnection(userId);
      
      // Update users list
      setUsers(prev => prev.filter(user => user.id !== userId));
    };

    // Add new socket event listeners for media state changes
    socketRef.current.on("media_state_change", ({ userId, audio, video }) => {
      setUserMediaState(prev => ({
        ...prev,
        [userId]: { audio, video }
      }));
    });

    // Initialize local media state
    setUserMediaState(prev => ({
      ...prev,
      [socketRef.current.id]: { audio: true, video: true }
    }));

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

  const toggleMedia = (type, userId = socketRef.current?.id) => {
    if (!userId) return;

    setUserMediaState(prev => {
      const newState = {
        ...prev,
        [userId]: {
          ...prev[userId],
          [type]: !prev[userId]?.[type]
        }
      };

      // If it's local user, actually toggle the tracks
      if (userId === socketRef.current?.id) {
        const tracks = localStreamRef.current?.getTracks();
        tracks?.forEach(track => {
          if (track.kind === type) {
            track.enabled = newState[userId][type];
          }
        });

        // Emit the state change to other users
        socketRef.current?.emit("media_state_change", {
          audio: newState[userId].audio,
          video: newState[userId].video
        });
      }

      return newState;
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>WebRTC Conference</h1>
        <div style={styles.participantCount}>
          Active participants: {totalVideos}
        </div>
      </div>
      
      <div style={{...styles.gridContainer, ...getGridStyle()}}>
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
          <div style={styles.controlsContainer}>
            <button
              onClick={() => toggleMedia('audio')}
              style={{
                ...styles.controlButton,
                ...(!(userMediaState[socketRef.current?.id]?.audio) && styles.controlButtonOff)
              }}
            >
              {userMediaState[socketRef.current?.id]?.audio ? Icons.micOn : Icons.micOff}
            </button>
            <button
              onClick={() => toggleMedia('video')}
              style={{
                ...styles.controlButton,
                ...(!(userMediaState[socketRef.current?.id]?.video) && styles.controlButtonOff)
              }}
            >
              {userMediaState[socketRef.current?.id]?.video ? Icons.videoOn : Icons.videoOff}
            </button>
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
                    // Mute audio if audio is disabled
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
              <div style={styles.controlsContainer}>
                <div style={{
                  ...styles.controlButton,
                  ...(!(mediaState?.audio) && styles.controlButtonOff)
                }}>
                  {mediaState?.audio ? Icons.micOn : Icons.micOff}
                </div>
                <div style={{
                  ...styles.controlButton,
                  ...(!(mediaState?.video) && styles.controlButtonOff)
                }}>
                  {mediaState?.video ? Icons.videoOn : Icons.videoOff}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;