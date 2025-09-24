interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className, width = 40, height = 40 }: LogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Green background with rounded corners */}
      <rect
        width="40"
        height="40"
        rx="8"
        fill="#00DC33"
      />
      {/* White icon design - simplified "C" shape for CanSys */}
      <path
        d="M20 10C14.477 10 10 14.477 10 20C10 25.523 14.477 30 20 30C22.761 30 25.266 28.946 27.071 27.071"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M27 17L27 23"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}