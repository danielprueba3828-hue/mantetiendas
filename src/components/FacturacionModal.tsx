import React from 'react';
import type { Case, User } from '../types';
import type { SupervisorBillingData } from '../billing';
import { getSupervisorBillingProfile } from '../billing';

interface FacturacionModalProps {
  show: boolean;
  facturacionCasoId: number | null;
  cases: Case[];
  currentUser: User | null;
  billingProfiles: Record<string, SupervisorBillingData>;
  setBillingProfiles: React.Dispatch<React.SetStateAction<Record<string, SupervisorBillingData>>>;
  facturacionProfileMode: 'default_supervisor' | 'custom_material';
  setFacturacionProfileMode: (val: 'default_supervisor' | 'custom_material') => void;
  facturacionRuc: string;
  setFacturacionRuc: (val: string) => void;
  facturacionRazonSocial: string;
  setFacturacionRazonSocial: (val: string) => void;
  facturacionDireccion: string;
  setFacturacionDireccion: (val: string) => void;
  facturacionTelefono: string;
  setFacturacionTelefono: (val: string) => void;
  facturacionEmail: string;
  setFacturacionEmail: (val: string) => void;
  facturacionMonto: string;
  setFacturacionMonto: (val: string) => void;
  facturacionConcepto: string;
  setFacturacionConcepto: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const FacturacionModal: React.FC<FacturacionModalProps> = ({
  show,
  facturacionCasoId,
  cases,
  currentUser,
  billingProfiles,
  setBillingProfiles,
  facturacionProfileMode,
  setFacturacionProfileMode,
  facturacionRuc,
  setFacturacionRuc,
  facturacionRazonSocial,
  setFacturacionRazonSocial,
  facturacionDireccion,
  setFacturacionDireccion,
  facturacionTelefono,
  setFacturacionTelefono,
  facturacionEmail,
  setFacturacionEmail,
  facturacionMonto,
  setFacturacionMonto,
  facturacionConcepto,
  setFacturacionConcepto,
  onClose,
  onSubmit
}) => {
  if (!show) return null;

  const currentCase = cases.find(c => c.id === facturacionCasoId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📄</span> Datos de Facturación {facturacionCasoId ? `Caso #${facturacionCasoId}` : ''}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-surface)', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              className={`btn ${facturacionProfileMode === 'default_supervisor' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px', fontSize: '0.82rem' }}
              onClick={() => {
                setFacturacionProfileMode('default_supervisor');
                const supName = currentUser?.rol === 'supervisor' ? currentUser.nombre : 'LUIS VALLEJOS';
                const { profile } = getSupervisorBillingProfile(supName, billingProfiles);
                setFacturacionRuc(profile.ruc);
                setFacturacionRazonSocial(profile.razonSocial);
                setFacturacionDireccion(profile.direccion);
                setFacturacionTelefono(profile.telefono);
                setFacturacionEmail(profile.email);
              }}
            >
              🏢 Perfil Supervisor
            </button>
            <button
              type="button"
              className={`btn ${facturacionProfileMode === 'custom_material' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px', fontSize: '0.82rem' }}
              onClick={() => setFacturacionProfileMode('custom_material')}
            >
              ✏️ Personalizado / Tienda
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>RUC / CI *</label>
              <input
                type="text"
                required
                value={facturacionRuc}
                onChange={e => setFacturacionRuc(e.target.value)}
                placeholder="1790012345001"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Teléfono *</label>
              <input
                type="text"
                required
                value={facturacionTelefono}
                onChange={e => setFacturacionTelefono(e.target.value)}
                placeholder="(02) 298-3000"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Razón Social *</label>
            <input
              type="text"
              required
              value={facturacionRazonSocial}
              onChange={e => setFacturacionRazonSocial(e.target.value)}
              placeholder="MARATHON SPORTS S.A."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Dirección Fiscal *</label>
            <input
              type="text"
              required
              value={facturacionDireccion}
              onChange={e => setFacturacionDireccion(e.target.value)}
              placeholder="Av. 6 de Diciembre y Gaspar de Villarroel"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Correo Electrónico para Factura *</label>
            <input
              type="email"
              required
              value={facturacionEmail}
              onChange={e => setFacturacionEmail(e.target.value)}
              placeholder="facturacion@marathonsports.com"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Monto Aprox. ($)</label>
              <input
                type="number"
                step="0.01"
                value={facturacionMonto}
                onChange={e => setFacturacionMonto(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Concepto / Detalle</label>
              <input
                type="text"
                value={facturacionConcepto}
                onChange={e => setFacturacionConcepto(e.target.value)}
                placeholder="Mantenimiento o Repuestos"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>💾 Guardar Datos Facturación</button>
          </div>
        </form>
      </div>
    </div>
  );
};
