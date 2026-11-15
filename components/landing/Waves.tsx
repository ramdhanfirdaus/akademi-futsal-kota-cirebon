/**
 * The crest's sea: alternating blue and white bands. The page's one moving element —
 * the bands drift slowly unless the visitor prefers reduced motion.
 */
const WAVE = 'M0 30 C 60 0, 120 0, 180 30 S 300 60, 360 30 S 480 0, 540 30 S 660 60, 720 30 V 80 H 0 Z';

export default function Waves({ className = '' }: { className?: string }) {
  const bands = [
    { fill: '#0A72B8', y: 0, speed: 'animate-[wave_18s_linear_infinite]' },
    { fill: '#FFFFFF', y: 18, speed: 'animate-[wave_24s_linear_infinite_reverse]' },
    { fill: '#0A72B8', y: 36, speed: 'animate-[wave_30s_linear_infinite]' },
    { fill: '#083A63', y: 54, speed: 'animate-[wave_36s_linear_infinite_reverse]' }, // joins the Jadwal section below
  ];
  return (
    <div aria-hidden className={`relative h-24 overflow-hidden sm:h-32 ${className}`}>
      {bands.map((b, i) => (
        <svg
          key={i}
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className={`absolute left-0 h-full w-[200%] motion-reduce:animate-none ${b.speed}`}
          style={{ top: `${b.y}%` }}
        >
          <path d={WAVE} fill={b.fill} />
          {/* 1px overlap hides the hairline seam between the two copies. */}
          <path d={WAVE} fill={b.fill} transform="translate(719 0)" />
        </svg>
      ))}
    </div>
  );
}
