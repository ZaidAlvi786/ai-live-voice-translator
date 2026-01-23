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

    // Scheduling for smooth playback
    const nextStartTime = useRef<number>(0);
    const pendingBuffer = useRef<Uint8Array>(new Uint8Array(0));

    const playAudioChunk = async (arrayBuffer: ArrayBuffer) => {
        if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000, // or 44100, ctx will adapt
            });
        }
        const ctx = audioContext.current;

        // Append new chunk to pending buffer
        const newChunk = new Uint8Array(arrayBuffer);
        const newPending = new Uint8Array(pendingBuffer.current.length + newChunk.length);
        newPending.set(pendingBuffer.current);
        newPending.set(newChunk, pendingBuffer.current.length);
        pendingBuffer.current = newPending;

        try {
            // Attempt to decode the *entire* pending buffer
            // clone the buffer because decodeAudioData detaches it
            const bufferToDecode = pendingBuffer.current.slice(0).buffer;

            // We use a promise wrapper for decodeAudioData to handle older browser callbacks if needed, 
            // but modern returns promise.
            const audioBuffer = await ctx.decodeAudioData(bufferToDecode);

            // If success, we have a valid audio frame(s). 
            // PROBLEM: In MP3, we might decode the same frames again if we keep the buffer?
            // NO. If we successfully decode, it means we found valid frames.
            // Ideally, we should only clear the *consumed* bytes, but decodeAudioData doesn't tell us bytes consumed.
            // STRATEGY FOR SCAFFOLD: 
            // If it decodes, play it and CLEAR pending buffer. 
            // This assumes the chunk *ended* on a frame boundary or decodeAudioData ignored the trailing bytes.
            // This is "optimistic streaming". 

            pendingBuffer.current = new Uint8Array(0); // Clear

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            // Schedule
            const now = ctx.currentTime;
            // If nextStartTime is in the past (gap), reset to now
            if (nextStartTime.current < now) {
                nextStartTime.current = now;
            }

            source.start(nextStartTime.current);
            nextStartTime.current += audioBuffer.duration;

        } catch (e) {
            // Decoding failed, likely incomplete frame. Keep buffer and wait for next chunk.
            // console.debug("Buffering audio chunk...");
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
