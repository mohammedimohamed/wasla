import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface QRCodeBadgeProps {
  value: string;
  logoUrl?: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

export function QRCodeBadge({ 
  value, 
  logoUrl, 
  size = 120, 
  fgColor = '#000000', 
  bgColor = '#ffffff',
  className
}: QRCodeBadgeProps) {
  return (
    <div className={`qr-container inline-flex items-center justify-center p-2 rounded-xl bg-white shadow-xl border border-white/20 ${className || ''}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        fgColor={fgColor}
        bgColor={bgColor}
        imageSettings={
          logoUrl
            ? {
                src: logoUrl,
                height: size * 0.25,
                width: size * 0.25,
                excavate: true,
              }
            : undefined
        }
      />
    </div>
  );
}
