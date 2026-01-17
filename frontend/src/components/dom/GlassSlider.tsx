interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    min?: number;
    max?: number;
    step?: number;
}

export function GlassSlider({ label, ...props }: SliderProps) {
    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center text-xs uppercase tracking-widest text-neural-300 font-bold ml-1">
                <span>{label}</span>
                <span className="opacity-50">{props.value}%</span>
            </div>
            <input
                type="range"
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer hover:bg-white/20 transition-colors
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neural-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(59,130,246,0.5)]
        "
                {...props}
            />
        </div>
    );
}
