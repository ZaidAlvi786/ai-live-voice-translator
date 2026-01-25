"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Mic, Upload, FileText, Settings, ShieldAlert, Activity, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- SELF-CONTAINED UI COMPONENTS ---

const Button = ({ children, variant = "primary", className = "", ...props }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none h-10 py-2 px-4";
    const variants: any = {
        primary: "bg-[#00F2FF] text-black hover:bg-[#00dbe6]",
        outline: "border border-input hover:bg-white/10 hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
    };
    return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Badge = ({ children }: any) => (
    <span className="inline-flex items-center rounded-full border border-white/10 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
        {children}
    </span>
);

const Card = ({ children, className = "" }: any) => (
    <div className={`rounded-lg border border-white/10 bg-black/40 text-card-foreground shadow-sm ${className}`}>
        {children}
    </div>
);

// --- FEATURE COMPONENTS ---

const ModeConfigurator = ({ agentId }: { agentId: string }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-md"><FileText className="w-5 h-5 text-blue-400" /></div>
        <div>
          <h4 className="font-semibold text-white">Interview Mode</h4>
          <p className="text-sm text-white/50">Formal, resume-based, 30-45s answers.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="h-8 text-white">Configure</Button>
    </div>
    <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/10 rounded-md"><Activity className="w-5 h-5 text-green-400" /></div>
        <div>
          <h4 className="font-semibold text-white">Standup Mode</h4>
          <p className="text-sm text-white/50">Casual, daily-update focus, &lt;20s answers.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="h-8 text-white">Configure</Button>
    </div>
  </div>
);

const KnowledgeUploader = ({ agentId }: { agentId: string }) => (
  <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center space-y-4 hover:bg-white/5 transition-colors cursor-pointer group">
    <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#00F2FF]/10 transition-colors">
      <Upload className="w-6 h-6 text-white/50 group-hover:text-[#00F2FF]" />
    </div>
    <div>
      <h3 className="font-semibold text-white">Upload Knowledge Base</h3>
      <p className="text-sm text-white/50">Drop PDF resumes, project docs, or standup notes.</p>
    </div>
    <div className="flex gap-2 justify-center pt-2">
       <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/70">Resume</span>
       <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/70">Projects</span>
       <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/70">Standup</span>
    </div>
  </div>
);

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const [activeTab, setActiveTab] = useState("training");
  
  // Mock Agent Data
  const agent = {
      id: agentId,
      name: "Devin (AI Engineer)",
      status: "ready",
      role: "Senior Full Stack",
  };

  if (!agent) return <div className="p-10 text-white">Loading Agent Neural Interface...</div>;

  return (
    <div className="h-full flex flex-col space-y-6 p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            {agent.name}
          </h1>
          <p className="text-white/50 flex items-center gap-2 text-sm">
            <ShieldAlert className="w-4 h-4 text-emerald-500" /> 
            Identity Immutable • Training Offline Only
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-white"><Settings className="mr-2 w-4 h-4"/> Settings</Button>
          <Button>
             <Mic className="mr-2 w-4 h-4" /> Arm for Meeting
          </Button>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="w-full">
        <div className="flex space-x-1 rounded-lg bg-white/5 p-1 w-fit mb-6">
            {['training', 'voice', 'audit'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                        px-3 py-1.5 text-sm font-medium rounded-md transition-all
                        ${activeTab === tab 
                            ? 'bg-black text-white shadow' 
                            : 'text-white/60 hover:text-white hover:bg-white/5'}
                    `}
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            ))}
        </div>
        
        {activeTab === 'training' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Left: Mode Configuration */}
             <Card className="p-0 overflow-hidden">
               <div className="p-6 border-b border-white/10">
                 <h3 className="text-lg font-semibold text-white">Behavioral Modes</h3>
                 <p className="text-sm text-white/50">Configure how the agent behaves in specific contexts.</p>
               </div>
               <div className="p-6">
                 <ModeConfigurator agentId={agentId} />
               </div>
             </Card>

             {/* Right: Knowledge Base */}
             <Card className="p-0 overflow-hidden">
               <div className="p-6 border-b border-white/10">
                 <h3 className="text-lg font-semibold text-white">Knowledge Injection</h3>
                 <p className="text-sm text-white/50">Upload immutable source documents.</p>
               </div>
               <div className="p-6">
                 <KnowledgeUploader agentId={agentId} />
               </div>
             </Card>
           </div>
        )}
        
        {activeTab === 'voice' && (
          <Card className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Voice Cloning</h3>
                <p className="text-sm text-white/50">Manage ElevenLabs voice profile.</p>
            </div>
            <div className="p-6">
                <div className="h-40 flex items-center justify-center border border-dashed border-white/10 rounded-lg bg-white/5">
                    <p className="text-white/50">Voice Profile: 21m00Tcm4TlvDq8ikWAM (Active)</p>
                </div>
            </div>
          </Card>
        )}

        {activeTab === 'audit' && (
             <Card className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Compliance Audit Trail</h3>
                <p className="text-sm text-white/50">Immutable log of all meeting interactions.</p>
            </div>
            <div className="p-6">
                <div className="space-y-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="p-3 border border-white/10 rounded bg-white/5 text-sm flex justify-between items-center text-white">
                            <span>Question: "What is your experience with React?"</span>
                            <span className="text-emerald-400 font-mono text-xs border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded">
                                Confidence: 0.9{i}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
