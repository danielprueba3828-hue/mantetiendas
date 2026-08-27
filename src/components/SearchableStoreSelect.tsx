import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Store, User } from '../types';
import { isStoreVisibleToUser } from '../helpers';

export const SearchableStoreSelect: React.FC<{
  stores: Store[];
  value: string | number;
  onChange: (val: any) => void;
  currentUser: User | null;
  placeholder?: string;
  allOptionLabel?: string;
  allOptionValue?: string;
}> = ({
  stores,
  value,
  onChange,
  currentUser,
  placeholder = "🔍 Escriba para buscar tienda...",
  allOptionLabel = "Todas las Tiendas",
  allOptionValue = "todos"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleStores = useMemo(() => {
    return stores.filter((s: Store) => isStoreVisibleToUser(s, currentUser));
  }, [stores, currentUser]);

  const selectedStore = useMemo(() => {
    if (value === allOptionValue || value === 'todas' || value === 'todos') return null;
    return stores.find((s: Store) => s.id.toString() === value.toString());
  }, [stores, value, allOptionValue]);

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return visibleStores;
    const q = searchQuery.toLowerCase().trim();
    return visibleStores.filter((s: Store) => 
      s.nombre.toLowerCase().includes(q) || 
      (s.ciudad && s.ciudad.toLowerCase().includes(q)) ||
      (s.direccion && s.direccion.toLowerCase().includes(q)) ||
      (s.unidad && s.unidad.toLowerCase().includes(q))
    );
  }, [visibleStores, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', minWidth: '180px', flex: 1, maxWidth: '320px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)',
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          gap: '8px',
          cursor: 'pointer',
          height: '36px',
          boxSizing: 'border-box',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          <span style={{ fontSize: '0.85rem' }}>🏬</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: selectedStore ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedStore ? selectedStore.nombre : allOptionLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {selectedStore && (
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                onChange(allOptionValue);
                setSearchQuery('');
                setIsOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: '2px 4px',
                lineHeight: 1
              }}
              title="Limpiar filtro"
            >
              ✕
            </button>
          )}
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 99999,
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          maxHeight: '280px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
            <input 
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-panel)',
                border: '1px solid var(--primary)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.82rem',
                color: 'var(--text-main)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            <div 
              onClick={() => {
                onChange(allOptionValue);
                setSearchQuery('');
                setIsOpen(false);
              }}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--primary)',
                background: !selectedStore ? 'var(--primary-subtle)' : 'transparent',
                marginBottom: '2px'
              }}
            >
              🏬 {allOptionLabel}
            </div>

            {filteredStores.map((s: Store) => (
              <div 
                key={s.id}
                onClick={() => {
                  onChange(s.id);
                  setSearchQuery('');
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: selectedStore?.id === s.id ? 'var(--primary-subtle)' : 'transparent',
                  fontWeight: selectedStore?.id === s.id ? 700 : 500,
                  marginBottom: '2px'
                }}
              >
                <span>{s.nombre}</span>
                {s.ciudad && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.ciudad}</span>}
              </div>
            ))}

            {filteredStores.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                No se encontraron tiendas para "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
