import React, { useState, useRef, useEffect } from 'react';

interface CategoryItem {
  id: number;
  nombre: string;
  prioridadSugerida: number;
}

interface EditableCategorySelectProps {
  value: string;
  onChange: (val: string) => void;
  categories: CategoryItem[];
  placeholder?: string;
  required?: boolean;
}

export const EditableCategorySelect: React.FC<EditableCategorySelectProps> = ({
  value,
  onChange,
  categories,
  placeholder = "Escribe o selecciona...",
  required = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(c =>
    c.nombre.toLowerCase().includes((value || '').toLowerCase().trim())
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          name="category"
          data-testid="category-input"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          required={required}
          placeholder={placeholder}
          className="input-box category-select-input"
          style={{
            width: '100%',
            paddingRight: '32px',
            boxSizing: 'border-box'
          }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'transform 0.15s ease'
          }}
          title="Ver sugerencias de categorías"
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* Desplegable flotante inteligente de ideas */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '190px',
            overflowY: 'auto',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 10000,
            padding: '4px',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div style={{ padding: '4px 8px', fontSize: '0.68rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            💡 Ideas (o escribe libremente)
          </div>
          {filteredCategories.length > 0 ? (
            filteredCategories.map(cat => {
              const isMatch = value.toLowerCase().trim() === cat.nombre.toLowerCase().trim();
              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    onChange(cat.nombre);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: isMatch ? 700 : 500,
                    color: isMatch ? 'var(--primary)' : 'var(--text-main)',
                    background: isMatch ? 'var(--primary-subtle)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.12s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isMatch) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isMatch ? 'var(--primary-subtle)' : 'transparent';
                  }}
                >
                  <span>{cat.nombre}</span>
                  {isMatch && <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>✓</span>}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '8px 10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Usar "{value}" como categoría personalizada
            </div>
          )}
        </div>
      )}
    </div>
  );
};
