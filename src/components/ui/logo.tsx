interface Props {
  size?: 'sm' | 'md' | 'lg'
  wordmark?: boolean
}

const SIZE = {
  sm: 24,
  md: 32,
  lg: 44,
}

const TEXT_SIZE = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
}

export default function Logo({ size = 'md', wordmark = true }: Props) {
  const px = SIZE[size]

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={px}
        height={px}
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="200" height="200" rx="44" fill="#111827" />
        <line
          x1="100"
          y1="30"
          x2="18"
          y2="178"
          stroke="white"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="30"
          x2="182"
          y2="178"
          stroke="white"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <line
          x1="55"
          y1="110"
          x2="145"
          y2="110"
          stroke="white"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <circle cx="100" cy="30" r="11" fill="white" />
      </svg>
      {wordmark && (
        <span
          className={`font-semibold tracking-tight text-gray-900 ${TEXT_SIZE[size]}`}
        >
          amplai
        </span>
      )}
    </div>
  )
}
