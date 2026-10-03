import React from 'react';

export const DNaxFooter: React.FC = () => {
  return (
    <footer style={{
      marginTop: 'auto',
      padding: '24px 16px 20px',
      borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
      background: 'var(--bg-panel, #0f172a)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '0.8rem',
      color: 'var(--text-muted, #94a3b8)',
      textAlign: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Isotipo SVG Oficial D&Nax Studios (#6C4CE0 con acento #19C48A) */}
        <svg 
          width="26" 
          height="26" 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'inline-block', verticalAlign: 'middle' }}
        >
          <rect width="100" height="100" rx="22" fill="#6C4CE0" />
          <path 
            d="M30 28H52C63.0457 28 72 36.9543 72 48V52C72 63.0457 63.0457 72 52 72H30V28Z" 
            stroke="#19C48A" 
            strokeWidth="8" 
            strokeLinejoin="round" 
          />
          <circle cx="50" cy="50" r="10" fill="#19C48A" />
        </svg>

        {/* Wordmark D&Nax Studios */}
        <span style={{ 
          fontSize: '1rem', 
          fontWeight: 800, 
          letterSpacing: '-0.02em', 
          color: '#ffffff' 
        }}>
          D&Nax <span style={{ color: '#19C48A' }}>Studios</span>
        </span>
      </div>

      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
        Diseñado y Creado por <strong>D&Nax Studios</strong> • MaintTrac Enterprise
      </div>
    </footer>
  );
};
