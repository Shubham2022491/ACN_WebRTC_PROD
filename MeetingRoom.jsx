import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }, // Google's public STUN server
    ],
};

const socket = io("http://localhost:4000"); // Connect to signaling server

function MeetingRoom() {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const roomId = searchParams.get("room_id");

    const [peerConnection, setPeerConnection] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);

    useEffect(() => {
        const initWebRTC = async () => {
            const pc = new RTCPeerConnection(ICE_SERVERS);     // creates a peerconnection object for the student (for which the codes instance is running), amd ICE_servers help the students browser to get its public IP+Port
            setPeerConnection(pc);

            // Get User's Media (Camera & Mic)
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            // Add tracks to Peer Connection
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Handle incoming tracks
            const remoteStream = new MediaStream();
            setRemoteStream(remoteStream);
            pc.ontrack = event => {
                event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
            };

            // Handle ICE candidates
            pc.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit("ice-candidate", { roomId, candidate: event.candidate });
                }
            };

            // Handle Offer/Answer Exchange
            socket.on("offer", async offer => {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("answer", { roomId, answer });
            });

            socket.on("answer", async answer => {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            });

            socket.on("ice-candidate", async ({ candidate }) => {
                if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            });

            // Join Room
            socket.emit("join-room", roomId);
        };

        initWebRTC();
    }, [roomId]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-96 text-center">
                <h1 className="text-2xl font-semibold mb-4">Meeting Room</h1>
                <p className="text-gray-600">Room ID: <strong>{roomId}</strong></p>
                <div className="mt-4">
                    <video autoPlay playsInline ref={video => video && (video.srcObject = localStream)} />
                    <video autoPlay playsInline ref={video => video && (video.srcObject = remoteStream)} />
                </div>
            </div>
        </div>
    );
}

export default MeetingRoom;
