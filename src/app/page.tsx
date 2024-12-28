"use client";

import { useEffect, useRef, useState } from "react";

export default function SenderPage() {
    const [isRecording, setIsRecording] = useState(false);
    const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<string>("prompt");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    useEffect(() => {
        // Check if browser supports permissions API
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions
                .query({ name: "microphone" as PermissionName })
                .then((status) => {
                    console.log("Microphone permission status:", status.state);
                    setPermissionStatus(status.state);
                    status.onchange = () => {
                        console.log("Permission status changed:", status.state);
                        setPermissionStatus(status.state);
                    };
                })
                .catch((err) => {
                    console.error("Error checking permission:", err);
                });
        }
    }, []);

    useEffect(() => {
        const ws = new WebSocket("ws://" + process.env.WS_SERVER);
        setWsConnection(ws);

        return () => {
            ws.close();
        };
    }, []);

    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const err = "MediaDevices API not supported in this browser";
            console.error(err);
            setError(err);
            return;
        }

        console.log("Requesting microphone access...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Microphone access granted");
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && wsConnection?.readyState === WebSocket.OPEN) {
                    wsConnection.send(event.data);
                }
            };

            mediaRecorder.start(100); // Send data every 100ms
            setIsRecording(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            console.error("Error accessing microphone:", errorMessage);
            setError(errorMessage);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
            setIsRecording(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold mb-4">Audio Sender</h1>
            <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-6 py-3 rounded-full ${
                    isRecording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
                } text-white transition-colors`}>
                {isRecording ? "Stop Recording" : "Start Recording"}
            </button>
            {error && <div className="text-sm text-red-600 mb-4">Error: {error}</div>}
            {permissionStatus !== "prompt" && (
                <div
                    className={`text-sm mb-4 ${permissionStatus === "granted" ? "text-green-600" : "text-yellow-600"}`}>
                    Microphone permission: {permissionStatus}
                </div>
            )}
            {isRecording && <div className="text-sm text-gray-600">Recording and streaming audio...</div>}
        </div>
    );
}
