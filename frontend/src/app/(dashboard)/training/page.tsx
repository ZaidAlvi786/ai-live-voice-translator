'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link as LinkIcon, FileText, Database, CheckCircle, Search, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import { useAgentStore } from '@/stores/useAgentStore';
import { useNeuralMapStore, KnowledgeNode } from '@/stores/useNeuralMapStore';
import { useAuthStore } from '@/stores/useAuthStore';

// UI Components (Inline for speed/focus, ideally in /components)
const TabButton = ({ active, label, icon: Icon, onClick }: any) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
            ${active
                ? 'bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/50 shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                : 'text-white/40 border border-transparent hover:text-white hover:bg-white/5'}
        `}
    >
        <Icon size={14} />
        {label}
    </button>
);

export default function TrainingPage() {
    const { agents, fetchAgents } = useAgentStore();
    const [searchTerm, setSearchTerm] = useState('');
    const { nodes, fetchNodes, ingestNode, ingestUrl, ingestText, ingestionState, ingestionProgress, deleteNode } = useNeuralMapStore();
    const { token } = useAuthStore();

    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'files' | 'url' | 'text'>('files');
    const [urlInput, setUrlInput] = useState('');
    const [textTitle, setTextTitle] = useState('');
    const [textContent, setTextContent] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Fetch
    useEffect(() => {
        fetchAgents();
    }, []);

    // Set Default Agent
    useEffect(() => {
        if (agents.length > 0 && !selectedAgentId) {
            setSelectedAgentId(agents[0].id);
        }
    }, [agents]);

    // Fetch Nodes when Agent Changes
    useEffect(() => {
        if (selectedAgentId && token) {
            fetchNodes(selectedAgentId, token);
        }
    }, [selectedAgentId, token]);

    // Filtered Nodes
    const filteredNodes = nodes.filter(node =>
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            ingestNode(e.target.files[0]);
            // Trigged upload immediately for this page flow? 
            // The store queues it. We need to trigger uploadPendingNodes.
            // Let's modify the flow slightly: useNeuralMapStore queues it. 
            // We should call uploadPendingNodes immediately after queueing effectively.
            // But state updates are async. 
            // Better: Let's manually trigger upload in a useEffect or ensure store handles auto-upload if we want.
            // Current store: queue -> user calls uploadPendingNodes. 
            // We will add a "Upload Queue" button or auto-trigger. Let's add a button.
        }
    };

    // Auto-upload pending files for smoother UX? 
    // Let's stick to the store's "Queue -> Upload" pattern for now, but maybe expose a "Sync" button.
    const { pendingFiles, uploadPendingNodes } = useNeuralMapStore();

    return (
        <div className="w-full h-full min-h-screen bg-[#020408] text-white p-8 overflow-y-auto">

            {/* Header */}
            <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2">NEURAL TRAINING</h1>
                    <p className="text-white/40 font-mono text-sm">Manage Knowledge Base & RAG Context</p>
                </div>

                {/* Agent Selector */}
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-[#00F2FF] uppercase tracking-widest">Target Agent Core</label>
                    <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="bg-[#0B111D] border border-white/10 text-white text-sm rounded-lg px-4 py-2 focus:border-[#00F2FF] focus:outline-none w-64 font-mono appearance-none cursor-pointer hover:border-white/30 transition-colors"
                    >
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8 h-[calc(100vh-250px)]">

                {/* Left: Ingestion Controls */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

                    {/* Mode Tabs */}
                    <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
                        <TabButton active={activeTab === 'files'} label="Files" icon={Upload} onClick={() => setActiveTab('files')} />
                        <TabButton active={activeTab === 'url'} label="Web URL" icon={LinkIcon} onClick={() => setActiveTab('url')} />
                        <TabButton active={activeTab === 'text'} label="Raw Text" icon={FileText} onClick={() => setActiveTab('text')} />
                    </div>

                    {/* Ingestion Area */}
                    <div className="flex-1 bg-[#05080a] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />

                        <AnimatePresence mode='wait'>
                            {activeTab === 'files' && (
                                <motion.div
                                    key="files"
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="h-full flex flex-col"
                                >
                                    <h3 className="text-lg font-bold mb-4">File Ingestion</h3>

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 border-2 border-dashed border-white/10 rounded-xl hover:border-[#00F2FF]/50 hover:bg-[#00F2FF]/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group/drop"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover/drop:scale-110 transition-transform">
                                            <Upload className="text-white/30 group-hover/drop:text-[#00F2FF]" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-white/60 group-hover/drop:text-white">Click to Upload</p>
                                            <p className="text-xs text-white/30 mt-1">PDF, TXT, DOCX</p>
                                        </div>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

                                    {/* Pending Queue */}
                                    {pendingFiles.length > 0 && (
                                        <div className="mt-6">
                                            <div className="text-xs font-bold text-[#00F2FF] mb-2 flex justify-between">
                                                <span>QUEUE ({pendingFiles.length})</span>
                                                <button
                                                    onClick={() => selectedAgentId && token && uploadPendingNodes(selectedAgentId, token)}
                                                    className="underline hover:text-white"
                                                >
                                                    Sync All
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {pendingFiles.map((f, i) => (
                                                    <div key={i} className="flex justify-between items-center text-xs bg-white/5 p-2 rounded">
                                                        <span className="truncate">{f.name}</span>
                                                        <span className="text-white/40">{(f.size / 1024).toFixed(0)}KB</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'url' && (
                                <motion.div
                                    key="url"
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="h-full flex flex-col"
                                >
                                    <h3 className="text-lg font-bold mb-4">Web Scraper</h3>
                                    <div className="flex-1 flex flex-col gap-4">
                                        <div>
                                            <label className="text-xs text-white/40 uppercase font-bold mb-2 block">Target URL</label>
                                            <input
                                                value={urlInput}
                                                onChange={(e) => setUrlInput(e.target.value)}
                                                placeholder="https://docs.example.com/..."
                                                className="w-full bg-[#0B111D] border border-white/10 rounded-lg p-4 text-sm font-mono focus:border-[#00F2FF] focus:outline-none"
                                            />
                                        </div>
                                        <div className="p-4 bg-[#00F2FF]/5 border border-[#00F2FF]/20 rounded-lg">
                                            <p className="text-xs text-[#00F2FF]/80 leading-relaxed">
                                                <RecycleIcon className="inline w-3 h-3 mr-1" />
                                                The scraper will extract main text content and ignore navigation/ads.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        disabled={!urlInput || ingestionState === 'processing'}
                                        onClick={() => {
                                            if (selectedAgentId && token) ingestUrl(selectedAgentId, urlInput, token);
                                            setUrlInput('');
                                        }}
                                        className="w-full py-4 bg-[#00F2FF] hover:bg-[#00dbe6] text-black font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50"
                                    >
                                        {ingestionState === 'processing' ? 'SCRAPING...' : 'INGEST URL'}
                                    </button>
                                </motion.div>
                            )}

                            {activeTab === 'text' && (
                                <motion.div
                                    key="text"
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="h-full flex flex-col"
                                >
                                    <h3 className="text-lg font-bold mb-4">Direct Text Entry</h3>
                                    <div className="flex-1 flex flex-col gap-4">
                                        <input
                                            value={textTitle}
                                            onChange={(e) => setTextTitle(e.target.value)}
                                            placeholder="Document Title"
                                            className="w-full bg-[#0B111D] border border-white/10 rounded-lg p-3 text-sm font-bold focus:border-[#00F2FF] focus:outline-none"
                                        />
                                        <textarea
                                            value={textContent}
                                            onChange={(e) => setTextContent(e.target.value)}
                                            placeholder="Paste knowledge content here..."
                                            className="w-full flex-1 bg-[#0B111D] border border-white/10 rounded-lg p-4 text-sm font-mono focus:border-[#00F2FF] focus:outline-none resize-none"
                                        />
                                    </div>
                                    <button
                                        disabled={!textTitle || !textContent || ingestionState === 'processing'}
                                        onClick={() => {
                                            if (selectedAgentId && token) ingestText(selectedAgentId, textTitle, textContent, token);
                                            setTextTitle('');
                                            setTextContent('');
                                        }}
                                        className="mt-4 w-full py-4 bg-[#00F2FF] hover:bg-[#00dbe6] text-black font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50"
                                    >
                                        {ingestionState === 'processing' ? 'PROCESSING...' : 'SAVE TO MEMORY'}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right: Knowledge Graph List */}
                <div className="col-span-12 lg:col-span-8 bg-[#05080a]/80 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#05080a]">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Database size={16} className="text-[#00F2FF]" />
                            Knowledge Index
                        </h2>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="SEARCH KNOWLEDGE..."
                                    className="bg-[#0B111D] border border-white/10 rounded-full pl-8 pr-4 py-1.5 text-xs font-mono text-white focus:border-[#00F2FF] focus:outline-none w-48"
                                />
                            </div>
                            <div className="flex gap-4 text-xs font-mono text-white/40">
                                <span>NODES: {filteredNodes.length}</span>
                                <span>STATUS: {ingestionState === 'processing' ? 'SYNCING...' : 'ONLINE'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {filteredNodes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/20">
                                <Search size={48} className="mb-4 opacity-50" />
                                <p className="uppercase tracking-widest text-xs">No Matching Knowledge</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredNodes.map((node) => (
                                    <motion.div
                                        key={node.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 bg-white/5 border border-white/5 hover:border-[#00F2FF]/30 rounded-xl group transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-black rounded-lg text-[#00F2FF]">
                                                {node.type === 'web' ? <LinkIcon size={16} /> : <FileText size={16} />}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirm("Delete this knowledge node?") && selectedAgentId && token) {
                                                        deleteNode(selectedAgentId, node.label, token);
                                                    }
                                                }}
                                                className="text-white/20 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <h4 className="font-bold text-sm text-white/90 mb-1 truncate" title={node.label}>{node.label}</h4>
                                        <p className="text-xs text-white/40 font-mono mb-3">{node.description}</p>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-[#00F2FF]/10 text-[#00F2FF] px-2 py-1 rounded font-bold uppercase">
                                                READY
                                            </span>
                                            <span className="text-[10px] text-white/20 font-mono">
                                                ID: {node.id.toString().substring(0, 6)}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

const RecycleIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 7h10v10" />
        <path d="M7 17 17 7" />
    </svg>
)
