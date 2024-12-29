"use client";

import { useEffect, useRef, useState } from "react";

export default function ReceiverClient() {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;
    const [isAudioInitialized, setIsAudioInitialized] = useState(false);
    const connectionRef = useRef<any>(null);
    const [networkType, setNetworkType] = useState<string | null>(null);
    const [manuallyDisconnected, setManuallyDisconnected] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (typeof navigator !== "undefined" && "connection" in navigator) {
            connectionRef.current = (navigator as any).connection;
            console.log("Initial network type:", connectionRef.current.type);
            setError(`Network : ${connectionRef.current.type}`);

            const handleConnectionChange = () => {
                const type = connectionRef.current.type;
                setNetworkType(type); //wifi none 4g 3g 2g
                console.log("Network type changed:", type);
                setError(`Network : ${type}`);
                setTimeout(() => {
                    setError(null);
                }, 3000);
            };

            connectionRef.current.addEventListener("change", handleConnectionChange);

            return () => {
                connectionRef.current.removeEventListener("change", handleConnectionChange);
            };
        }
    }, []);

    useEffect(() => {
        if (!isMounted || !isAudioInitialized) return;

        console.log("Starting WebSocket connection with audio initialized");
        const ws = connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            wsRef.current?.close();
        };
    }, [isMounted, isAudioInitialized]); // Add isAudioInitialized as dependency

    // Add effect to monitor manuallyDisconnected changes
    useEffect(() => {
        console.log("Manual disconnect state changed:", manuallyDisconnected);
    }, [manuallyDisconnected]);

    const initializeAudio = async () => {
        try {
            console.log("Initializing audio context...");
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            if (audioContext.state === "suspended") {
                console.log("Resuming suspended audio context...");
                await audioContext.resume();
            }

            console.log("Audio context initialized successfully:", audioContext.state);
            setIsAudioInitialized(true);
            setError(null);
            return true;
        } catch (err) {
            console.error("Audio initialization error:", err);
            setError(`Audio initialization error: ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    };

    const connectWebSocket = () => {
        try {
            console.log("Connecting to WebSocket server...");
            if (!process.env.NEXT_PUBLIC_WS_SERVER) {
                throw new Error("WebSocket server address not configured");
            }
            const ws = new WebSocket("ws://" + process.env.NEXT_PUBLIC_WS_SERVER);
            ws.binaryType = "arraybuffer";
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("WebSocket connected successfully");
                setIsConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0;
            };

            ws.onclose = () => {
                console.log("WebSocket connection closed");
                setIsConnected(false);
                reconnectWebSocket();
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                setError("WebSocket connection error. Attempting to reconnect...");
            };

            ws.onmessage = async (event) => {
                if (!audioContextRef.current || !isAudioInitialized) {
                    console.log("Skipping audio chunk - not initialized");
                    setError("No Wifi, Skipping audio");
                    return;
                }

                try {
                    if (networkType !== process.env.NEXT_PUBLIC_NET_TYPE) {
                        console.log("Skipping audio chunk - network type:", networkType);
                        return;
                    }
                    const floatArray = new Float32Array(event.data);
                    const buffer = audioContextRef.current.createBuffer(1, floatArray.length, 44100);
                    buffer.copyToChannel(floatArray, 0);

                    const source = audioContextRef.current.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContextRef.current.destination);
                    source.start(0);
                    console.log("Playing audio chunk:", buffer.duration.toFixed(2), "seconds");
                } catch (error) {
                    console.error("Audio processing error:", error);
                    setError(`Audio processing error: ${error instanceof Error ? error.message : String(error)}`);
                }
            };

            return ws;
        } catch (error) {
            console.error("WebSocket connection error:", error);
            setError("Failed to connect to WebSocket server");
            return null;
        }
    };

    const reconnectWebSocket = () => {
        console.log("Reconnecting WebSocket...", manuallyDisconnected);
        if (manuallyDisconnected) {
            console.log("Skipping reconnection attempt - manually disconnected");
            return;
        }

        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setError("Maximum retry reached. Refreshing page...");
            // Wait 2 seconds before refreshing to show the message
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            return;
        }

        reconnectAttemptsRef.current++;
        console.log(`Reconnecting... Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
            const ws = connectWebSocket();
            if (!ws) reconnectWebSocket();
        }, 2000); // Reconnect after 2 seconds
    };

    const handleDisconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
            setIsConnected(false);
            reconnectAttemptsRef.current = 0;
            setManuallyDisconnected(true);
            setError("Disconnecting and refreshing page...");

            // Give time for the WebSocket to close properly and show the message
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    };

    const handleConnect = () => {
        setManuallyDisconnected(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        connectWebSocket();
    };

    if (!isMounted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold mb-4">Audio Receiver</h1>
                <div className="text-sm text-gray-600">Initializing...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold mb-4">Audio Receiver</h1>
            {!isAudioInitialized && (
                <button
                    onClick={initializeAudio}
                    className="px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors mb-4">
                    Initialize Audio
                </button>
            )}
            {isAudioInitialized && (
                <>
                    {isConnected ? (
                        <button
                            onClick={handleDisconnect}
                            className="px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors mb-4">
                            Disconnect
                        </button>
                    ) : (
                        <button
                            onClick={handleConnect}
                            className="px-6 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors mb-4">
                            Connect
                        </button>
                    )}
                </>
            )}
            <div className={`text-sm ${isConnected ? "text-green-600" : "text-yellow-600"}`}>
                Status: {isConnected ? "Connected" : "Disconnected"}
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="text-sm text-gray-600">
                {!isAudioInitialized
                    ? "Click Initialize Audio to start"
                    : isConnected
                    ? "Listening for audio stream..."
                    : "Attempting to connect..."}
            </div>
        </div>
    );
}
