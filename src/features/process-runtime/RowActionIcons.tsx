type Props = {
  onKill: () => void;
  onReveal: () => void;
  revealDisabled?: boolean;
};

export function RowActionIcons({ onKill, onReveal, revealDisabled }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        title="Kill process tree"
        className="rounded p-1 text-neutral-500 hover:bg-white/10 hover:text-red-300"
        onClick={(e) => {
          e.stopPropagation();
          onKill();
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <path d="M9 3h6l1 2h4v2H4V5h4l1-2z" strokeLinecap="round" />
          <path d="M6 9h12l-1 12H7L6 9z" strokeLinejoin="round" />
          <path d="M10 13v6M14 13v6" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        title="Reveal in Finder"
        disabled={revealDisabled}
        className="rounded p-1 text-neutral-500 hover:bg-white/10 hover:text-neutral-200 disabled:opacity-25"
        onClick={(e) => {
          e.stopPropagation();
          onReveal();
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <path
            d="M4 8l8-4 8 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"
            strokeLinejoin="round"
          />
          <path d="M4 8l8 4 8-4" strokeLinejoin="round" />
        </svg>
      </button>
    </span>
  );
}

