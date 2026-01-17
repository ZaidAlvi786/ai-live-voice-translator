interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    isLoading?: boolean;
}

export function GlassButton({ children, variant = 'primary', isLoading, className, ...props }: ButtonProps) {
    const baseStyles = "relative overflow-hidden px-6 py-3 rounded-lg font-medium tracking-wide transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-neural-500/80 hover:bg-neural-500 border border-neural-300/30 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
        secondary: "bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md",
        danger: "bg-crimson-500/80 hover:bg-crimson-500 border border-crimson-900/30 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className || ''}`}
            disabled={isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Processing...
                </span>
            ) : children}
        </button>
    );
}
