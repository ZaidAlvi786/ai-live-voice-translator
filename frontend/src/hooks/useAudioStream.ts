import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioStreamHook {
    isConnected: boolean;
    isRecording: boolean;
    connect: (url: string) => Promise<void>;
    disconnect: () => void;
    startRecording: () => void;
    stopRecording: () => void;
    messages: any[]; // Transcript messages
}

export function useAudioStream(): AudioStreamHook {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);

    const websocketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);

    const connect = useCallback(async (url: string) => {
        if (websocketRef.current) return;

        const ws = new WebSocket(url);
        websocketRef.current = ws;

        ws.onopen = () => {
            console.log('WS Connected');
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log('WS Disconnected');
            setIsConnected(false);
            setIsRecording(false);
        };

        ws.onmessage = async (event) => {
            // Handle incoming messages
            // If blob -> Audio
            // If text -> Transcript JSON
            if (event.data instanceof Blob) {
                playAudioBlob(event.data);
            } else {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === 'transcript') {
                        setMessages(prev => [...prev, data]);
                    }
                } catch (e) {
                    // console.warn("Received non-JSON text", event.data);
                }
            }
        };
    }, []);

    const disconnect = useCallback(() => {
        stopRecording();
        if (websocketRef.current) {
            websocketRef.current.close();
            websocketRef.current = null;
        }
    }, []);

    const startRecording = useCallback(async () => {
        if (!websocketRef.current || isRecording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);

            // Use ScriptProcessor for legacy support/ease of scaffolding. 
            // In prod, use AudioWorklet.
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (websocketRef.current?.readyState === WebSocket.OPEN) {
                    // Get raw PCM data (Float32)
                    const inputData = e.inputBuffer.getChannelData(0);

                    // Convert to 16-bit PCM for backend compatibility (if needed)
                    // or send raw bytes. Deepgram supports raw inputs.
                    // For efficiency, we simply send the raw buffer or downsample here.
                    // Sending raw float32 bytes for now.
                    websocketRef.current.send(inputData.buffer);
                }
            };

            source.connect(processor);
            processor.connect(audioContextRef.current.destination); // Destination is needed for chrome to play it (mute it though)

            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone", err);
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsRecording(false);
    }, []);

    // Helper to play audio chunks received from backend
    const playAudioBlob = async (blob: Blob) => {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            // Since we are creating a fresh context or using existing, ensure we decode + play
            // Note: For streaming playback without gaps, we'd need a dedicated Queue + SourceBuffer setup.
            // For scaffold, playing chunks individually is "okay" but will be choppy.
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start(0);
        } catch (err) {
            console.error("Error playing audio chunk", err);
        }
    };

    return { isConnected, isRecording, connect, disconnect, startRecording, stopRecording, messages };
}
