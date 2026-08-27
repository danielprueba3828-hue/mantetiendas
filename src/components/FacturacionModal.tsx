import React from 'react';
import type { Store, User, Case } from '../types';
import type { SupervisorBillingData } from '../billing';
import { getSupervisorBillingProfile } from '../billing';

interface FacturacionModalProps {
  show: boolean;
  facturacionCasoId: number | null;
  currentUser: User | null;
  cases?: Case[];
  stores?: Store[];
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
  currentUser,
  cases = [],
  stores = [],
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
  const [selectedCaseId, setSelectedCaseId] = React.useState<number | null>(facturacionCasoId);

  if (!show) return null;

  const currentCase = cases.find(c => c.id === (selectedCaseId || facturacionCasoId));
  const currentStore = currentCase ? stores.find(s => s.id === currentCase.tiendaId) : null;
  const supervisorName = currentStore?.supervisorName || (currentUser?.rol === 'supervisor' ? currentUser.nombre : 'No asignado');

  const handleSaveToProfile = () => {
    const supKey = currentUser?.nombre || 'Luis Vallejos';
    const updated = {
      ...billingProfiles,
      [supKey]: {
        ruc: facturacionRuc,
        razonSocial: facturacionRazonSocial,
        direccion: facturacionDireccion,
        email: facturacionEmail,
        telefono: facturacionTelefono
      }
    };
    setBillingProfiles(updated);
    try {
      localStorage.setItem('maint_billing_profiles', JSON.stringify(updated));
    } catch {}
    alert(`✅ Perfil de Facturación Predeterminado guardado para ${supKey}`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧾</span> Datos para Facturación
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Origen de Datos */}
          <div style={{ background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: '8px', display: 'block', color: 'var(--primary)', letterSpacing: '0.3px' }}>
              🏢 ORIGEN DE DATOS DE FACTURACIÓN:
            </label>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${facturacionProfileMode === 'default_supervisor' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setFacturacionProfileMode('default_supervisor');
                  const { profile } = getSupervisorBillingProfile(supervisorName, billingProfiles);
                  setFacturacionRuc(profile.ruc);
                  setFacturacionRazonSocial(profile.razonSocial);
                  setFacturacionDireccion(profile.direccion);
                  setFacturacionTelefono(profile.telefono);
                  setFacturacionEmail(profile.email);
                }}
                style={{ fontSize: '0.76rem', fontWeight: 700, borderRadius: '8px', padding: '7px 12px' }}
              >
                🏛️ Usar Predeterminado del Supervisor
              </button>

              <button
                type="button"
                className={`btn btn-sm ${facturacionProfileMode === 'custom_material' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFacturacionProfileMode('custom_material')}
                style={{ fontSize: '0.76rem', fontWeight: 700, borderRadius: '8px', padding: '7px 12px' }}
              >
                📦 Datos Especiales (Compra Materiales)
              </button>
            </div>

            {facturacionProfileMode === 'default_supervisor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  💡 Carga automática según el Supervisor asignado a la tienda del caso.
                </div>
                {currentUser && (currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                  <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                      ⚙️ Guardar cambios como mi perfil predeterminado:
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleSaveToProfile}
                      style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}
                    >
                      💾 Guardar en Mi Perfil
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seleccionar Caso */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-muted)', letterSpacing: '0.3px' }}>
              SELECCIONAR CASO (OPCIONAL):
            </label>
            <select
              className="custom-select"
              value={selectedCaseId || ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                setSelectedCaseId(val);
                if (val && facturacionProfileMode === 'default_supervisor') {
                  const targetCase = cases.find(c => c.id === val);
                  const store = targetCase ? stores.find(s => s.id === targetCase.tiendaId) : null;
                  const supName = store?.supervisorName || (currentUser?.rol === 'supervisor' ? currentUser.nombre : 'Luis Vallejos');
                  const { profile } = getSupervisorBillingProfile(supName, billingProfiles);
                  setFacturacionRuc(profile.ruc);
                  setFacturacionRazonSocial(profile.razonSocial);
                  setFacturacionDireccion(profile.direccion);
                  setFacturacionTelefono(profile.telefono);
                  setFacturacionEmail(profile.email);
                }
              }}
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.84rem', borderRadius: '8px' }}
            >
              <option value="">-- Sin Caso Específico / General --</option>
              {cases.filter(c => c.estado !== 'cerrado' && c.estado !== 'concluido').map(c => {
                const s = stores.find(st => st.id === c.tiendaId);
                return (
                  <option key={c.id} value={c.id}>
                    Caso #{c.id} - {s ? `${s.nombre} (Sup: ${s.supervisorName || 'No asignado'})` : `Tienda #${c.tiendaId}`} ({c.categoria})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Banner de Contexto de Tienda */}
          {(currentStore || currentUser?.rol === 'supervisor') && (
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '10px 12px', borderRadius: '10px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div>🏬 <strong>Tienda:</strong> {currentStore ? currentStore.nombre : 'General'}</div>
              <div>👔 <strong>Supervisor:</strong> {supervisorName}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>
                🔒 Estos datos de facturación se enviarán y quedarán visibles <strong>únicamente para {currentStore ? currentStore.nombre : 'la tienda'}</strong> y su supervisor.
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-muted)' }}>
              RUC O CÉDULA *:
            </label>
            <input
              type="text"
              required
              value={facturacionRuc}
              onChange={e => setFacturacionRuc(e.target.value)}
              placeholder="1790012345001"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-muted)' }}>
              RAZÓN SOCIAL / NOMBRE *:
            </label>
            <input
              type="text"
              required
              value={facturacionRazonSocial}
              onChange={e => setFacturacionRazonSocial(e.target.value)}
              placeholder="MARATHON SPORTS S.A."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-muted)' }}>
              DIRECCIÓN FISCAL:
            </label>
            <input
              type="text"
              value={facturacionDireccion}
              onChange={e => setFacturacionDireccion(e.target.value)}
              placeholder="Av. 6 de Diciembre y Gaspar de Villarroel, Quito"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-muted)' }}>
                TELÉFONO:
              </label>
              <input
                type="text"
                value={facturacionTelefono}
                onChange={e => setFacturacionTelefono(e.target.value)}
                placeholder="(02) 298-3000"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-muted)' }}>
                CORREO ELECTRÓNICO:
              </label>
              <input
                type="email"
                value={facturacionEmail}
                onChange={e => setFacturacionEmail(e.target.value)}
                placeholder="facturacion@marathon.com.ec"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-muted)' }}>
                MONTO ($) *:
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={facturacionMonto}
                onChange={e => setFacturacionMonto(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-muted)' }}>
                DETALLE / CONCEPTO:
              </label>
              <input
                type="text"
                value={facturacionConcepto}
                onChange={e => setFacturacionConcepto(e.target.value)}
                placeholder="ej: Servicio de mantenimiento o repuestos"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontWeight: 700, padding: '9px 16px', borderRadius: '8px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ fontWeight: 700, padding: '9px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🧾</span> Registrar y Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
