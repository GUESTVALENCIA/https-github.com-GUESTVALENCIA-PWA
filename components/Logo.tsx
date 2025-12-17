import React from 'react';

export const GuestsValenciaLogo: React.FC<{ className?: string, mode?: 'light' | 'dark' }> = ({ className = "h-12", mode = 'dark' }) => {
  // En modo 'dark' (fondo oscuro), el texto principal es blanco y el acento azul claro.
  const fillColor = mode === 'dark' ? '#ffffff' : '#0F172A'; 
  const accentColor = mode === 'dark' ? '#60A5FA' : '#2563EB';

  return (
    <svg viewBox="0 0 300 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* City Skyline Icon */}
      <circle cx="50" cy="50" r="45" stroke={accentColor} strokeWidth="3" />
      <path d="M20 75 L20 60 L30 60 L30 50 L40 50 L40 30 L50 30 L50 75" fill={fillColor} />
      <path d="M55 75 L55 35 L65 35 L65 45 L75 45 L75 75" fill={fillColor} />
      <path d="M80 75 L80 55 L90 55 L90 75" fill={fillColor} />
      
      {/* Windows */}
      <rect x="42" y="35" width="4" height="6" fill={mode === 'dark' ? '#000' : '#fff'} fillOpacity="0.5" />
      <rect x="58" y="40" width="4" height="4" fill={mode === 'dark' ? '#000' : '#fff'} fillOpacity="0.5" />

      {/* Text */}
      <text x="110" y="45" fontFamily="serif" fontSize="32" fontWeight="bold" fill={fillColor} letterSpacing="0.02em">
        <tspan fill={accentColor}>Guests</tspan>Valencia
      </text>
      <text x="112" y="70" fontFamily="sans-serif" fontSize="12" fontWeight="600" fill={fillColor} letterSpacing="0.15em" opacity="0.8" className="uppercase">
        Alojamientos Inteligentes
      </text>
    </svg>
  );
};