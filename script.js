const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

let mediaRecorder;
let audioChunks = [];

startBtn.onclick = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks);
        const audioUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement("a");
        a.href = audioUrl;
        a.download = "recording.webm";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        audioChunks = [];
    };

    mediaRecorder.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
};

stopBtn.onclick = () => {
    mediaRecorder.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
};
