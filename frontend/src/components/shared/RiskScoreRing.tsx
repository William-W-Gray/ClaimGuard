import { cn } from '@/lib/utils';
import { getRiskScoreColor } from '@/lib/formatters';

interface RiskScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export function RiskScoreRing({
  score,
  size = 72,
  strokeWidth = 8,
  className,
  showLabel = true,
}: RiskScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getRiskScoreColor(score);

  const textSize = size < 60 ? 'text-sm' : size < 80 ? 'text-lg' : 'text-2xl';
  const subTextSize = size < 60 ? 'text-[8px]' : 'text-[10px]';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Risk score: ${score} out of 100`}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Score fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold leading-none', textSize)} style={{ color }}>
            {score}
          </span>
          <span className={cn('text-gray-400 leading-none mt-0.5', subTextSize)}>risk</span>
        </div>
      )}
    </div>
  );
}
