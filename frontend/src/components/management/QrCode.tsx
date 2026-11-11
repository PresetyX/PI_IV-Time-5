import { useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { Box } from '@mui/material';

export default function QrCode({ value, size, label }: { value: string; size: number; label: string }) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const modules = qr.getModuleCount();
    let d = '';
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        if (qr.isDark(row, col)) d += `M${col + 2} ${row + 2}h1v1h-1z`;
      }
    }
    return { count: modules + 4, path: d };
  }, [value]);

  return (
    <Box
      component="svg"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${count} ${count}`}
      shapeRendering="crispEdges"
      sx={{ display: 'block', width: size, height: size, bgcolor: '#FFFFFF' }}
    >
      <path d={path} fill="#111111" />
    </Box>
  );
}
