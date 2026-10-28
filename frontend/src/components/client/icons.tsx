import { SvgIcon } from '@mui/material';
import type { SvgIconProps } from '@mui/material';
import type { ReactNode } from 'react';

function strokeIcon(children: ReactNode) {
  return function StrokeIcon(props: SvgIconProps) {
    return (
      <SvgIcon
        viewBox="0 0 24 24"
        {...props}
        sx={{
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          ...props.sx,
        }}
      >
        {children}
      </SvgIcon>
    );
  };
}

export const ClockIcon = strokeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);

export const TableIcon = strokeIcon(<path d="M3 8h18M6 8v11M18 8v11M5 5h14" />);

export const BagIcon = strokeIcon(
  <>
    <path d="M6 7h12l-1 13H7z" />
    <path d="M9 7a3 3 0 0 1 6 0" />
  </>,
);

export const TruckIcon = strokeIcon(
  <>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </>,
);

export const ChevronRightIcon = strokeIcon(<path d="M9 6l6 6-6 6" />);

export const ArrowLeftIcon = strokeIcon(<path d="M19 12H5M11 6l-6 6 6 6" />);

export const ArrowRightIcon = strokeIcon(<path d="M5 12h14M13 6l6 6-6 6" />);

export const CheckIcon = strokeIcon(<path d="M5 12.5l4.5 4.5L19 7.5" />);

export const QrOffIcon = strokeIcon(
  <>
    <rect x="4" y="4" width="6" height="6" rx="1.5" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" />
    <path d="M15 15l5 5M20 15l-5 5" />
  </>,
);

export const PlusIcon = strokeIcon(<path d="M12 5v14M5 12h14" />);

export const InfoIcon = strokeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </>,
);

export const LockIcon = strokeIcon(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
);

export const WifiOffIcon = strokeIcon(
  <path d="M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 4.2-2.6M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.4-1.9M22 8.8a15 15 0 0 0-10.2-3.7M2 2l20 20" />,
);
