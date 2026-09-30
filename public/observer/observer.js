const socket = io(location.hostname.endsWith(".vercel.app") ? { transports: ["websocket"] } : {});

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");

socket.emit("joinAsObserver", roomId);

socket.on("observerPeek", () => {
  document.getElementById("info").innerText =
    "First player peeked.";
});

socket.on("roundResult", result => {
  document.getElementById("info").innerText = result;
});