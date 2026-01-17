interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export function GlassInput({ label, ...props }: InputProps) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-neural-300 font-bold ml-1">
                {label}
            </label>
            <input
                {...props}
                className="
          w-full px-4 py-3 
          bg-white/5 border border-white/10 rounded-lg 
          text-white placeholder-white/20
          focus:outline-none focus:border-neural-500 focus:ring-1 focus:ring-neural-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)]
          transition-all duration-300
        "
            />
        </div>
    );
}
