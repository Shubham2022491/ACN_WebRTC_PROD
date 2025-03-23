import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function App() {
  const localVideoRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);
  const socketInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate initializations
    if (socketInitializedRef.current) {
      console.log("Socket already initialized, skipping re-initialization");
      return;
    }
    
    socketInitializedRef.current = true;
    console.log("Initializing socket and WebRTC connections");
    
    // Initialize socket connection
    // socketRef.current = io("wss://acn-webrtc-signaling-server-prod.onrender.com", {
    //     transports: ['websocket'],
    //     reconnectionAttempts: 5,
    //     timeout: 5000,
    // });
    
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
    };
  }, []); // Keep empty dependency array to run only once

  // Get the number of videos to display (local + remotes)
  const totalVideos = 1 + Object.keys(remoteStreams).length;
  
  // Determine grid layout class based on count
  const getGridClass = () => {
    if (totalVideos <= 1) return "grid-cols-1";
    if (totalVideos <= 2) return "grid-cols-2";
    if (totalVideos <= 4) return "grid-cols-2";
    if (totalVideos <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  // Calculate video size based on count
  const getVideoSize = () => {
    if (totalVideos <= 2) return "h-64";
    if (totalVideos <= 4) return "h-48";
    if (totalVideos <= 9) return "h-40";
    return "h-32";
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">WebRTC Multi-User Conference</h1>
      <div className="mb-2 text-sm text-gray-500">
        Active connections: {Object.keys(peerConnectionsRef.current).length}
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">
          Connected Users: {users.length} 
          {users.length > 0 && socketRef.current && 
           ` (You + ${users.filter(u => u.id !== socketRef.current.id).length} others)`}
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {users.map((user) => (
            <div key={user.id} 
                 className={`px-3 py-1 rounded-full text-sm ${
                   socketRef.current && user.id === socketRef.current.id 
                   ? "bg-blue-100" : "bg-gray-100"
                 }`}>
              {user.name} {socketRef.current && user.id === socketRef.current.id && "(You)"}
            </div>
          ))}
        </div>
      </div>
      
      <div className={`grid ${getGridClass()} gap-4`}>
        {/* Local video */}
        <div className="relative bg-gray-200 rounded-lg overflow-hidden">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full ${getVideoSize()} object-cover bg-black`}
          />
          <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-1 text-xs rounded">
            You (Local)
          </div>
        </div>
        
        {/* Remote videos */}
        {Object.entries(remoteStreams).map(([userId, stream]) => {
          const user = users.find(u => u.id === userId);
          return (
            <div key={userId} className="relative bg-gray-200 rounded-lg overflow-hidden">
              <video 
                autoPlay 
                playsInline 
                className={`w-full ${getVideoSize()} object-cover bg-black`}
                ref={el => {
                  if (el) el.srcObject = stream;
                }}
              />
              <div className="absolute bottom-2 left-2 bg-gray-800 text-white px-2 py-1 text-xs rounded">
                {user?.name || userId.substring(0, 6)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
