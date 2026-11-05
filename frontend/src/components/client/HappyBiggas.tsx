import { keyframes } from '@emotion/react';
import { Box } from '@mui/material';
import { CHEF_PATHS } from '../BrandMark';

const bounce = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg) scale(1, 1); }
  25% { transform: translateY(-12px) rotate(-7deg) scale(.96, 1.04); }
  50% { transform: translateY(0) rotate(0deg) scale(1.07, .93); }
  75% { transform: translateY(-6px) rotate(6deg) scale(.98, 1.02); }
`;

const hatSway = keyframes`
  from { transform: rotate(-7deg); }
  to { transform: rotate(9deg); }
`;

const mustacheWiggle = keyframes`
  0%, 100% { transform: rotate(-9deg); }
  50% { transform: rotate(9deg); }
`;

const sparkle = keyframes`
  0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
  40% { transform: scale(1) rotate(90deg); opacity: 1; }
  70% { transform: scale(.8) rotate(140deg); opacity: .8; }
`;

const STAR = 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)';
const SPARKLES = [
  { left: '-6%', top: '8%', scale: 0.26, delay: 0 },
  { left: '86%', top: '-4%', scale: 0.3, delay: 0.35 },
  { left: '92%', top: '62%', scale: 0.22, delay: 0.7 },
];
const stillWhenAsked = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } };

/** O Biggas pulando de alegria, para comemorar com o cliente. */
export default function HappyBiggas({ size, color, sparkleColor }: { size: number; color: string; sparkleColor: string }) {
  return (
    <Box aria-hidden sx={{ position: 'relative', width: size, height: size, color }}>
      {SPARKLES.map((star) => (
        <Box
          key={star.left}
          sx={{
            position: 'absolute',
            left: star.left,
            top: star.top,
            width: Math.round(size * star.scale),
            height: Math.round(size * star.scale),
            bgcolor: sparkleColor,
            clipPath: STAR,
            animation: `${sparkle} 1.4s ease-in-out ${star.delay}s infinite`,
            ...stillWhenAsked,
          }}
        />
      ))}
      <Box
        component="svg"
        viewBox="395 250 410 400"
        sx={{
          display: 'block',
          width: '100%',
          height: '100%',
          overflow: 'visible',
          transformOrigin: '50% 100%',
          animation: `${bounce} .9s ease-in-out infinite`,
          ...stillWhenAsked,
        }}
      >
        <Box
          component="g"
          sx={{
            transformBox: 'fill-box',
            transformOrigin: '30% 100%',
            animation: `${hatSway} .45s ease-in-out infinite alternate`,
            ...stillWhenAsked,
          }}
        >
          <path d={CHEF_PATHS.hat} fill="currentColor" />
          <path d={CHEF_PATHS.band} fill="currentColor" />
        </Box>
        <path d={CHEF_PATHS.eyes} fill="none" stroke="currentColor" strokeWidth={11} strokeLinecap="round" />
        <Box
          component="g"
          sx={{
            transformBox: 'fill-box',
            transformOrigin: '45% 25%',
            animation: `${mustacheWiggle} .45s ease-in-out infinite`,
            ...stillWhenAsked,
          }}
        >
          <path d={CHEF_PATHS.mustache} fill="currentColor" />
        </Box>
      </Box>
    </Box>
  );
}
