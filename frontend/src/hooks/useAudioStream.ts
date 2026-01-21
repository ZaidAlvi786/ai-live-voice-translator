import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

interface AudioStreamConfig {
    meetingId: string;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: any) => void;
}

export function useAudioStream({ meetingId, onConnect, onDisconnect, onError }: AudioStreamConfig) {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // Refs for persistence across renders
    const ws = useRef<WebSocket | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const stream = useRef<MediaStream | null>(null);
    const processor = useRef<ScriptProcessorNode | null>(null);

    const { token } = useAuthStore();

    const connect = useCallback(() => {
        if (!meetingId || ws.current) return;

        try {
            // Construct WebSocket URL
            // Adjust protocol (ws/wss) and host based on env
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = process.env.NEXT_PUBLIC_API_URL
                ? new URL(process.env.NEXT_PUBLIC_API_URL).host
                : 'localhost:8000';

            const wsUrl = `${protocol}//${host}/api/v1/ws/${meetingId}?token=${token}`;

            console.log("Connecting to Audio WS:", wsUrl);
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log("Audio WS Connected");
                setIsConnected(true);
                onConnect?.();
            };

            ws.current.onclose = () => {
                console.log("Audio WS Disconnected");
                setIsConnected(false);
                onDisconnect?.();
                stopAudio();
                ws.current = null;
            };

            ws.current.onerror = (error) => {
                console.error("Audio WS Error:", error);
                onError?.(error);
            };

            ws.current.onmessage = async (event) => {
                // Determine if binary (audio) or text (control)
                if (event.data instanceof Blob) {
                    // Playback Audio
                    playAudioChunk(await event.data.arrayBuffer());
                } else {
                    try {
                        const data = JSON.parse(event.data);
                        console.log("WS Control Message:", data);
                    } catch (e) {
                        console.warn("Received unknown text message:", event.data);
                    }
                }
            };

        } catch (err) {
            console.error("Failed to establish WS connection:", err);
            onError?.(err);
        }
    }, [meetingId, token, onConnect, onDisconnect, onError]);

    const disconnect = useCallback(() => {
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        stopAudio();
        setIsConnected(false);
    }, []);

    // --- Audio Input Handling ---

    const startAudio = useCallback(async () => {
        try {
            if (!navigator.mediaDevices) {
                throw new Error("Media devices not supported");
            }

            stream.current = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000 // Target sample rate for backend
                }
            });

            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000,
            });

            const source = audioContext.current.createMediaStreamSource(stream.current);

            // Use ScriptProcessor for raw PCM access (deprecated but reliable for simple chunks)
            // Ideally migrate to AudioWorklet for production
            processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);

            processor.current.onaudioprocess = (e) => {
                if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;

                // Get raw PCM data (Float32Array)
                const inputData = e.inputBuffer.getChannelData(0);

                // Convert to Int16 for backend compatibility if needed, 
                // or send Float32 directly. Let's send Float32 bytes for now or Int16.
                // Assuming backend expects raw bytes. Converting to Int16 is standard for PCM.
                const pcmData = convertFloat32ToInt16(inputData);

                ws.current.send(pcmData);
            };

            source.connect(processor.current);
            processor.current.connect(audioContext.current.destination); // Needed for Chrome to activate processor

            setIsRecording(true);

        } catch (err) {
            console.error("Failed to start audio capture:", err);
            onError?.(err);
        }
    }, [onError]);

    const stopAudio = useCallback(() => {
        if (stream.current) {
            stream.current.getTracks().forEach(track => track.stop());
            stream.current = null;
        }
        if (processor.current) {
            processor.current.disconnect();
            processor.current = null;
        }
        if (audioContext.current) {
            audioContext.current.close();
            audioContext.current = null;
        }
        setIsRecording(false);
    }, []);

    // --- Audio Output Handling ---

    const playAudioChunk = async (arrayBuffer: ArrayBuffer) => {
        if (!audioContext.current) return;

        // This is a naive implementation. 
        // Real-time streaming requires a jitter buffer and scheduling.
        // For scaffold: decode and play immediately (may have gaps).

        // Note: decodeAudioData accepts full files/chunks with headers. 
        // If backend sends raw PCM, we need to wrap it or use a custom buffer source.

        // Assuming backend sends raw Int16 PCM:
        // We would need to convert back to Float32 and schedule.
        // For simplicity, let's assume valid audio chunks (e.g. mp3/wav) OR raw PCM we convert.

        try {
            // Simplified: Expecting raw PCM? Or decoded?
            // Let's assume we create a buffer and play.
            // ... implementation deferred for complexity ...
            console.log("Received audio chunk, size:", arrayBuffer.byteLength);
        } catch (e) {
            console.error("Error playing audio chunk", e);
        }
    };

    // Helper to convert Float32 to Int16 PCM
    const convertFloat32ToInt16 = (buffer: Float32Array) => {
        let l = buffer.length;
        let buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, Math.max(-1, buffer[l])) * 0x7FFF;
        }
        return buf.buffer;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        connect,
        disconnect,
        startAudio,
        stopAudio,
        isConnected,
        isRecording
    };
}
