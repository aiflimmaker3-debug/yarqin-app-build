import React, { useState } from 'react';
import logoSrc from '../assets/images/tepekkur_logo.png';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

const LOGO_SRC = logoSrc;

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-lg shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
        }}
        aria-label="تەپەككۇر بۇلىقى لوگوسى"
      >
        <svg
          width={Math.round(size * 0.72)}
          height={Math.round(size * 0.72)}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="16" cy="17" r="11" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.45" />
          <circle cx="16" cy="17" r="7" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.7" />
          <path d="M16 11L20 18L16 25L12 18L16 11Z" stroke="var(--accent)" strokeWidth="1.75" />
          <circle cx="16" cy="5.5" r="2" fill="var(--text-primary)" />
          <circle cx="11" cy="8.5" r="1.6" fill="var(--text-primary)" />
          <circle cx="21" cy="8.5" r="1.6" fill="var(--text-primary)" />
          <path d="M11 8.5L16 5.5L21 8.5Z" stroke="var(--text-primary)" strokeWidth="1.2" />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="تەپەككۇر بۇلىقى لوگوسى"
      referrerPolicy="no-referrer"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`rounded-lg object-contain bg-white shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
