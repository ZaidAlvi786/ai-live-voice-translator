'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SkipBack, Database, Search, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { GlassButton } from '@/components/dom/GlassButton';
import { useAgentStore } from '@/stores/useAgentStore';
import { Agent } from '@/types';

export default function AgentLogsPage() {
    const router = useRouter();
    const params = useParams();
    const { agents, fetchAgents, meetings, fetchMeetings } = useAgentStore();
    const [agent, setAgent] = useState<Agent | null>(null);

    useEffect(() => {
        if (agents.length === 0) {
            fetchAgents();
        }
    }, [agents, fetchAgents]);

    useEffect(() => {
        if (params.agentId && agents.length > 0) {
            const found = agents.find(a => a.id === params.agentId);
            setAgent(found || null);
            if (found) {
                fetchMeetings(found.id);
            }
        }
    }, [params.agentId, agents, fetchMeetings]);

    if (!agent) {
        return null; // Or generic loading
    }

    return (
        <div className="relative w-full min-h-full flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <GlassButton
                    variant="secondary"
                    onClick={() => router.back()}
                    className="!p-2"
                >
                    <SkipBack className="w-4 h-4" />
                </GlassButton>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        Neural Logs
                        <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded">
                            {agent.name}
                        </span>
                    </h1>
                </div>
            </div>

            {meetings.length === 0 ? (
                <GlassCard title="Logs" className="min-h-[500px] flex flex-col items-center justify-center text-center p-12">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                        <Database className="w-8 h-8 text-white/20" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">No Neural Records Found</h2>
                    <p className="text-white/40 max-w-md mx-auto mb-8">
                        This unit has not participated in any active sessions yet. Initiate a new interface session to generate logs.
                    </p>
                    <GlassButton
                        variant="primary"
                        onClick={() => router.push(`/agents/${agent.id}/interface`)}
                    >
                        Start Session
                    </GlassButton>
                </GlassCard>
            ) : (
                <div className="space-y-4">
                    {meetings.map((meeting) => (
                        <GlassCard key={meeting.id} title={new Date(meeting.started_at).toLocaleDateString()} className="flex justify-between items-center group">
                            <div>
                                <h3 className="text-white font-medium mb-1">
                                    Session {new Date(meeting.started_at).toLocaleTimeString()}
                                </h3>
                                <p className="text-xs text-white/40 font-mono">
                                    STATUS: {meeting.status.toUpperCase()}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                {meeting.summary && (
                                    <div className="text-xs text-white/60 max-w-md truncate mr-4">
                                        {meeting.summary}
                                    </div>
                                )}
                                <GlassButton variant="secondary" className="text-xs">
                                    View Details
                                </GlassButton>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
