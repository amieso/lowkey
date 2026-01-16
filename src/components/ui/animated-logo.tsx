'use client'

import { useId } from 'react'

interface AnimatedLogoProps {
  className?: string
  isHovered?: boolean
}

export function AnimatedLogo({ className = '', isHovered = false }: AnimatedLogoProps) {
  const id = useId()
  const clipId = `eyeClip-${id}`

  // Path for open eye
  const eyeOpen = "M8 4C10.0517 4 11.8618 4.52179 13.127 5.3125C14.4061 6.11201 15 7.08851 15 8C15 8.91149 14.4061 9.88799 13.127 10.6875C11.8618 11.4782 10.0517 12 8 12C5.9483 12 4.13819 11.4782 2.87305 10.6875C1.59387 9.88799 1 8.91149 1 8C1 7.08851 1.59387 6.11201 2.87305 5.3125C4.13819 4.52179 5.9483 4 8 4Z"

  // Path for closed eye (blink)
  const eyeClosed = "M8 7.8C10.0517 7.8 11.8618 7.85 13.127 7.9C14.4061 7.95 15 7.98 15 8C15 8.02 14.4061 8.05 13.127 8.1C11.8618 8.15 10.0517 8.2 8 8.2C5.9483 8.2 4.13819 8.15 2.87305 8.1C1.59387 8.05 1 8.02 1 8C1 7.98 1.59387 7.95 2.87305 7.9C4.13819 7.85 5.9483 7.8 8 7.8Z"

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-foreground ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={eyeOpen}>
            {isHovered && (
              <animate
                attributeName="d"
                dur="12s"
                repeatCount="indefinite"
                values={`${eyeOpen};${eyeOpen};${eyeClosed};${eyeOpen};${eyeOpen}`}
                keyTimes="0; 0.58; 0.60; 0.62; 1"
                calcMode="spline"
                keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"
              />
            )}
          </path>
        </clipPath>
        <style>
          {`
            @keyframes lookAround-${id} {
              0%, 8% { transform: translateX(0); }
              12%, 22% { transform: translateX(3.6px); }
              26%, 36% { transform: translateX(0); }
              40%, 50% { transform: translateX(-3.6px); }
              54%, 58% { transform: translateX(0); }
              62%, 72% { transform: translateX(0); }
              76%, 86% { transform: translateX(3.6px); }
              90%, 100% { transform: translateX(0); }
            }
            .pupil-move-${id} {
              animation: lookAround-${id} 12s ease-in-out infinite;
            }
          `}
        </style>
      </defs>

      {/* Outer circle */}
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="none" />

      {/* Eye shape stroke - animates via path morph */}
      <path
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        d={eyeOpen}
      >
        {isHovered && (
          <animate
            attributeName="d"
            dur="12s"
            repeatCount="indefinite"
            values={`${eyeOpen};${eyeOpen};${eyeClosed};${eyeOpen};${eyeOpen}`}
            keyTimes="0; 0.58; 0.60; 0.62; 1"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"
          />
        )}
      </path>

      {/* Pupil - clipped by eye shape, moves independently */}
      <g clipPath={`url(#${clipId})`}>
        <g className={isHovered ? `pupil-move-${id}` : ''}>
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
        </g>
      </g>
    </svg>
  )
}
