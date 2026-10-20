export function RoundedIcon({ name }: { name: 'home' | 'plug' | 'help' | 'library' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'home' && (
        <>
          <path
            fill="currentColor"
            stroke="none"
            d="M9.2 3.9c1.7-1.3 3.9-1.3 5.6 0l5.2 4c.8.7 1.2 1.7.9 2.5-.2.7-.8 1.1-1.6 1.1h-.1v5.8c0 2-1.1 3.2-3.1 3.2h-1.8c-.7 0-1.1-.5-1.1-1.2v-3.4a1.2 1.2 0 0 0-2.4 0v3.4c0 .7-.4 1.2-1.1 1.2H7.9c-2 0-3.1-1.2-3.1-3.2v-5.8h-.1c-.8 0-1.4-.4-1.6-1.1-.3-.8.1-1.8.9-2.5z"
          />
        </>
      )}
      {name === 'plug' && (
        <>
          <path d="M8.3 7.5V4.2m7.4 3.3V4.2M6.2 8h11.6v3a5.8 5.8 0 0 1-5.8 5.8h0A5.8 5.8 0 0 1 6.2 11zM12 17v3" />
          <path d="M8.8 11.2h6.4" />
        </>
      )}
      {name === 'help' && (
        <>
          <circle cx="12" cy="12" r="8.3" />
          <path d="M9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.7-2.5 2-2.5 3.7" />
          <circle cx="12" cy="16.7" r=".9" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'library' && (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2.4" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2.4" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2.4" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2.4" />
        </>
      )}
    </svg>
  );
}
