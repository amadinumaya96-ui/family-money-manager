export function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* --- FAMILY SECTION (Top) --- */}
      {/* Left Parent */}
      <circle cx="14" cy="12" r="3.5" fill="currentColor" />
      <path d="M8 22c0-3.5 2.5-5 6-5s6 1.5 6 5H8z" fill="currentColor" />

      {/* Right Parent */}
      <circle cx="26" cy="12" r="3.5" fill="currentColor" />
      <path d="M20 22c0-3.5 2.5-5 6-5s6 1.5 6 5H20z" fill="currentColor" />

      {/* Child in the Center */}
      <circle cx="20" cy="15" r="2.5" fill="currentColor" />
      <path d="M15.5 22c0-2.5 1.5-3.5 4.5-3.5s4.5 1 4.5 3.5H15.5z" fill="currentColor" />

      {/* --- DIVIDER LINE --- */}
      <path d="M4 25h32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />

      {/* --- MONEY SECTION (Bottom) --- */}
      {/* Left Side Coin */}
      <circle cx="14" cy="31" r="4.5" fill="currentColor" opacity="0.4" />
      
      {/* Right Side Coin */}
      <circle cx="26" cy="31" r="4.5" fill="currentColor" opacity="0.4" />
      
      {/* Center Main Coin */}
      <circle cx="20" cy="31" r="5.5" fill="currentColor" />
      {/* Shiny star/inner accent inside the main coin */}
      <circle cx="20" cy="31" r="3" stroke="white" strokeWidth="1" fill="none" opacity="0.7" />
    </svg>
  );
}