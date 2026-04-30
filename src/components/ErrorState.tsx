interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`card p-8 text-center flex flex-col items-center gap-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-loss/10 flex items-center justify-center text-loss">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="font-display text-lg text-text-primary">{title}</h3>
      <p className="text-text-secondary text-sm max-w-md">{message}</p>
      {retry && (
        <button onClick={retry} className="btn-ghost mt-2">
          Retry
        </button>
      )}
    </div>
  );
}
