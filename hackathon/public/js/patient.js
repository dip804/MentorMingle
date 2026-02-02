const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const peerConnection = new RTCPeerConnection();

// Get camera & mic access
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    localVideo.srcObject = stream;
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
});

peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
};

peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit("candidate", { candidate: event.candidate, room: "therapy-room" });
    }
};

// Join room
socket.emit("join-room", "therapy-room");

socket.on("offer", async (offer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", { answer, room: "therapy-room" });
});

socket.on("candidate", async (data) => {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
});
