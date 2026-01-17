'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    speaker: 'agent' | 'human';
    text: string;
    timestamp: string;
}

export function TranscriptStream() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', speaker: 'human', text: "Can you explain the architecture?", timestamp: '10:01' },
        { id: '2', speaker: 'agent', text: "Certainly. Neuralis is built on a distributed spatial mesh...", timestamp: '10:01' },
    ]);

    // Simulate incoming messages
    useEffect(() => {
        const interval = setInterval(() => {
            const newMsg: Message = {
                id: Date.now().toString(),
                speaker: Math.random() > 0.5 ? 'agent' : 'human',
                text: "Simulating real-time conversation stream packet dispatch...",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, newMsg]);
        }, 5000); // New message every 5s

        return () => clearInterval(interval);
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar" ref={scrollRef}>
                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: msg.speaker === 'agent' ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.speaker === 'agent' ? 'justify-start' : 'justify-end'}`}
                        >
                            <div className={`
                        max-w-[80%] p-4 rounded-xl 
                        ${msg.speaker === 'agent'
                                    ? 'bg-neural-500/20 border border-neural-500/30 text-white rounded-tl-none'
                                    : 'bg-white/5 border border-white/10 text-white/80 rounded-tr-none'}
                    `}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-bold uppercase tracking-widest ${msg.speaker === 'agent' ? 'text-neural-300' : 'text-white/40'}`}>
                                        {msg.speaker === 'agent' ? 'Neural Core' : 'Interviewer'}
                                    </span>
                                    <span className="text-xs text-white/20 ml-2">{msg.timestamp}</span>
                                </div>
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
