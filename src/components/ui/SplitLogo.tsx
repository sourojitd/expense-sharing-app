'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface SplitLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

export function SplitLogo({ className, size = 24, animated = true }: SplitLogoProps) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', animated && 'split-logo', className)}
      aria-label="Splito logo"
    >
      <defs>
        {/* Left half gradient: violet → indigo */}
        <linearGradient id={`${uid}l`} x1="2" y1="2" x2="32" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Right half gradient: cyan → teal */}
        <linearGradient id={`${uid}r`} x1="16" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>

        {/* Glow line gradient */}
        <linearGradient id={`${uid}g`} x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="40%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#67E8F9" />
        </linearGradient>

        {/* S-curve clip: left half */}
        <clipPath id={`${uid}cl`}>
          <path d="M0 0 L24 0 C30 14, 18 34, 24 48 L0 48 Z" />
        </clipPath>

        {/* S-curve clip: right half */}
        <clipPath id={`${uid}cr`}>
          <path d="M24 0 L48 0 L48 48 L24 48 C18 34, 30 14, 24 0 Z" />
        </clipPath>
      </defs>

      {/* Left half */}
      <g className="split-logo-left" clipPath={`url(#${uid}cl)`}>
        <circle cx="24" cy="24" r="22" fill={`url(#${uid}l)`} />
        {/* Inner highlight */}
        <ellipse cx="18" cy="16" rx="10" ry="8" fill="white" opacity="0.1" />
      </g>

      {/* Right half */}
      <g className="split-logo-right" clipPath={`url(#${uid}cr)`}>
        <circle cx="24" cy="24" r="22" fill={`url(#${uid}r)`} />
        {/* Inner highlight */}
        <ellipse cx="32" cy="18" rx="8" ry="6" fill="white" opacity="0.08" />
      </g>

      {/* S-curve split line — glows on hover */}
      <path
        className="split-logo-glow"
        d="M24 3 C30 14, 18 34, 24 45"
        stroke={`url(#${uid}g)`}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.25"
      />
    </svg>
  );
}
