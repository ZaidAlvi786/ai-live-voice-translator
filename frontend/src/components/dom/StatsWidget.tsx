interface StatsWidgetProps {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: string;
}

export function StatsWidget({ label, value, trend, trendValue, color = 'neural' }: StatsWidgetProps) {
    const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-crimson-500' : 'text-white/50';
    const borderColor = color === 'crimson' ? 'border-crimson-500/30' : 'border-neural-500/30';

    return (
        <div className={`glass-card p-6 border ${borderColor} flex flex-col justify-between h-32 hover:bg-white/5 transition-colors`}>
            <span className="text-xs uppercase tracking-widest text-white/40 font-bold">{label}</span>

            <div className="flex items-end justify-between">
                <span className="text-4xl font-bold tracking-tight text-white">{value}</span>
            </div>

            {trendValue && (
                <div className={`text-xs ${trendColor} flex items-center gap-1`}>
                    {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '•'} {trendValue}
                </div>
            )}
        </div>
    );
}
