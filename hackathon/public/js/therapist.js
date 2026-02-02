const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startCallBtn = document.getElementById("startCall");

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

startCallBtn.addEventListener("click", async () => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", { offer, room: "therapy-room" });
});

socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", async (data) => {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
});
