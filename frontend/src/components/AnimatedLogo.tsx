'use client';

/**
 * AnimatedLogo — JUsports
 * On mount, plays a one-time sequence where sport equipment animates in:
 *   1. Football flies in from the left, spinning
 *   2. Cricket bat swings and "hits" a ball which flies off
 *   3. Badminton shuttle drops and bounces
 *   4. Basketball bounces in from the right
 * Then the wordmark "JUsports" types/fades in, and the whole thing
 * settles into a small idle state (ball gently bobbing).
 *
 * Pure CSS keyframe animation — no JS animation libraries needed.
 * Respects prefers-reduced-motion (falls back to a simple fade-in).
 *
 * Usage: <AnimatedLogo /> — drop into your Navbar component.
 * Size controlled via the `size` prop (default 40 = 40px tall).
 */

interface Props {
  size?: number;
  className?: string;
}

export default function AnimatedLogo({ size = 40, className = '' }: Props) {
  return (
    <div
      className={`jus-logo ${className}`}
      style={{ height: size, ['--jus-size' as string]: `${size}px` }}
      role="img"
      aria-label="JUsports logo"
    >
      <svg viewBox="0 0 320 80" width={size * 4} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Football — flies in spinning from the left */}
        <g className="jus-football">
          <circle cx="28" cy="40" r="14" fill="#F4F1EA" stroke="#0B1210" strokeWidth="1.5" />
          <g stroke="#0B1210" strokeWidth="1.3" fill="#0B1210">
            <polygon points="28,30 33,35 31,41 25,41 23,35" />
            <line x1="28" y1="26" x2="28" y2="30" />
            <line x1="38" y1="34" x2="33" y2="35" />
            <line x1="36" y1="46" x2="31" y2="41" />
            <line x1="20" y1="46" x2="25" y2="41" />
            <line x1="18" y1="34" x2="23" y2="35" />
          </g>
        </g>

        {/* Cricket bat — swings in */}
        <g className="jus-bat" transform="translate(64,40)">
          <rect x="-3" y="-22" width="6" height="26" rx="2" fill="#C98A3B" />
          <rect x="-2.5" y="2" width="5" height="9" rx="1.5" fill="#5C3A1E" />
        </g>

        {/* Cricket ball — sits, then gets "hit" and flies offscreen up-right */}
        <circle className="jus-ball" cx="64" cy="46" r="5" fill="#9B2C2C" stroke="#5C1414" strokeWidth="0.8" />

        {/* Badminton shuttle — drops in, bounces */}
        <g className="jus-shuttle" transform="translate(108,18)">
          <circle cx="0" cy="10" r="3.5" fill="#F4F1EA" stroke="#0B1210" strokeWidth="1" />
          <path d="M -4 8 L -9 -4 M 0 7 L 0 -5 M 4 8 L 9 -4" stroke="#F4F1EA" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        {/* Basketball — bounces in from the right */}
        <g className="jus-basketball" transform="translate(146,40)">
          <circle r="13" fill="#D97A3B" stroke="#0B1210" strokeWidth="1.3" />
          <path d="M -13 0 H 13 M 0 -13 V 13 M -9 -9 Q 0 0 -9 9 M 9 -9 Q 0 0 9 9" stroke="#0B1210" strokeWidth="1" fill="none" />
        </g>

        {/* Wordmark */}
        <g className="jus-wordmark">
          <text x="180" y="50" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" letterSpacing="-0.5" fill="#F4F1EA">
            JU<tspan fill="#5EEAD4">sports</tspan>
          </text>
        </g>
      </svg>

      <style>{`
        .jus-logo {
          display: inline-flex;
          align-items: center;
          line-height: 0;
        }
        .jus-logo svg { display: block; height: 100%; width: auto; }

        /* Football: fly in from far left while spinning, then settle */
        .jus-football {
          transform-origin: 28px 40px;
          animation: jusFootballIn 0.7s cubic-bezier(.2,.8,.3,1) both;
        }
        @keyframes jusFootballIn {
          0%   { transform: translateX(-90px) rotate(0deg); opacity: 0; }
          70%  { opacity: 1; }
          100% { transform: translateX(0) rotate(540deg); opacity: 1; }
        }

        /* Bat: swings down onto the ball, timed after football lands */
        .jus-bat {
          transform-origin: 64px 18px;
          animation: jusBatSwing 0.35s ease-in 0.75s both;
        }
        @keyframes jusBatSwing {
          0%   { transform: translate(64px,40px) rotate(-70deg); opacity: 0; }
          40%  { opacity: 1; }
          100% { transform: translate(64px,40px) rotate(15deg); opacity: 1; }
        }

        /* Ball: sits still, then gets struck and flies off up-right */
        .jus-ball {
          animation: jusBallHit 0.5s cubic-bezier(.3,0,.6,1) 1.05s both;
        }
        @keyframes jusBallHit {
          0%   { opacity: 0; transform: translate(0,0); }
          15%  { opacity: 1; transform: translate(0,0); }
          100% { opacity: 1; transform: translate(34px,-30px); }
        }

        /* Shuttle: drops from above, small bounce */
        .jus-shuttle {
          animation: jusShuttleDrop 0.6s cubic-bezier(.3,1.6,.5,1) 1.4s both;
        }
        @keyframes jusShuttleDrop {
          0%   { transform: translate(108px,-20px); opacity: 0; }
          60%  { opacity: 1; }
          100% { transform: translate(108px,18px); opacity: 1; }
        }

        /* Basketball: bounces in from the right with squash settle */
        .jus-basketball {
          animation: jusBballIn 0.6s cubic-bezier(.3,1.4,.4,1) 1.75s both;
        }
        @keyframes jusBballIn {
          0%   { transform: translate(220px,10px) scale(0.8); opacity: 0; }
          60%  { opacity: 1; }
          80%  { transform: translate(146px,44px) scale(1.08,0.9); }
          100% { transform: translate(146px,40px) scale(1); opacity: 1; }
        }

        /* Wordmark: fades + slides in last */
        .jus-wordmark {
          animation: jusWordIn 0.5s ease-out 2.15s both;
        }
        @keyframes jusWordIn {
          0%   { opacity: 0; transform: translateX(10px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .jus-football, .jus-bat, .jus-ball, .jus-shuttle, .jus-basketball, .jus-wordmark {
            animation: jusReducedFade 0.3s ease-out both !important;
          }
          @keyframes jusReducedFade {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}