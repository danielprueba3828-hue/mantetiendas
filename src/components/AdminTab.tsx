import React from 'react';
import type { Store, User } from '../types';

interface AdminTabProps {
  adminSectionTab: 'usuarios' | 'tiendas';
  setAdminSectionTab: (val: 'usuarios' | 'tiendas') => void;
  showAdminUserForm: boolean;
  setShowAdminUserForm: (val: boolean) => void;
  showAdminStoreForm: boolean;
  setShowAdminStoreForm: (val: boolean) => void;
  adminUserSearch: string;
  setAdminUserSearch: (val: string) => void;
  adminRoleFilter: string;
  setAdminRoleFilter: (val: string) => void;
  adminSupervisorFilter: string;
  setAdminSupervisorFilter: (val: string) => void;
  adminStoreSearch: string;
  setAdminStoreSearch: (val: string) => void;
  users: User[];
  stores: Store[];
  editingUserId: number | null;
  admName: string;
  setAdmName: (val: string) => void;
  admEmail: string;
  setAdmEmail: (val: string) => void;
  admUsername: string;
  setAdmUsername: (val: string) => void;
  admContrasena: string;
  setAdmContrasena: (val: string) => void;
  admRole: 'administrador' | 'jefe_tienda' | 'subjefe' | 'supervisor' | 'tecnico';
  setAdmRole: (val: 'administrador' | 'jefe_tienda' | 'subjefe' | 'supervisor' | 'tecnico') => void;
  admTiendaNombre: string;
  setAdmTiendaNombre: (val: string) => void;
  handleAdminUserSubmit: (e: React.FormEvent) => void;
  handleStartEditUser: (u: User) => void;
  handleCancelEditUser: () => void;
  handleAdminDeleteUser: (userId: number) => void;
  handleAdminToggleUser: (userId: number) => void;
  editingStoreId: number | null;
  newStoreName: string;
  setNewStoreName: (val: string) => void;
  newStoreCity: string;
  setNewStoreCity: (val: string) => void;
  newStoreDir: string;
  setNewStoreDir: (val: string) => void;
  handleAdminStoreSubmit: (e: React.FormEvent) => void;
  handleStartEditStore: (s: Store) => void;
  handleCancelEditStore: () => void;
  handleAdminDeleteStore: (storeId: number) => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  adminSectionTab,
  setAdminSectionTab,
  showAdminUserForm,
  setShowAdminUserForm,
  showAdminStoreForm,
  setShowAdminStoreForm,
  adminUserSearch,
  setAdminUserSearch,
  adminRoleFilter,
  setAdminRoleFilter,
  adminSupervisorFilter,
  setAdminSupervisorFilter,
  adminStoreSearch,
  setAdminStoreSearch,
  users,
  stores,
  editingUserId,
  admName,
  setAdmName,
  admEmail,
  setAdmEmail,
  admUsername,
  setAdmUsername,
  admContrasena,
  setAdmContrasena,
  admRole,
  setAdmRole,
  admTiendaNombre,
  setAdmTiendaNombre,
  handleAdminUserSubmit,
  handleStartEditUser,
  handleCancelEditUser,
  handleAdminDeleteUser,
  handleAdminToggleUser,
  editingStoreId,
  newStoreName,
  setNewStoreName,
  newStoreCity,
  setNewStoreCity,
  newStoreDir,
  setNewStoreDir,
  handleAdminStoreSubmit,
  handleStartEditStore,
  handleCancelEditStore,
  handleAdminDeleteStore
}) => {
  const filteredUsers = users.filter(u => {
    if (adminRoleFilter !== 'todos') {
      if (adminRoleFilter === 'jefe_tienda') {
        if (u.rol !== 'jefe_tienda' && u.rol !== 'subjefe') return false;
      } else if (u.rol !== adminRoleFilter) {
        return false;
      }
    }
    if (adminSupervisorFilter !== 'todos') {
      const supObj = users.find(sup => sup.rol === 'supervisor' && sup.nombre === adminSupervisorFilter);
      if (supObj) {
        if (u.rol === 'supervisor' && u.nombre !== adminSupervisorFilter) return false;
        const assignedIds = supObj.supervisorTiendas || [];
        if (u.tiendaId && !assignedIds.includes(u.tiendaId)) return false;
      }
    }
    if (adminUserSearch.trim()) {
      const q = adminUserSearch.toLowerCase();
      return (
        u.nombre.toLowerCase().includes(q) ||
        u.usuario.toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredStores = stores.filter(s => {
    if (adminSupervisorFilter !== 'todos') {
      const supObj = users.find(sup => sup.rol === 'supervisor' && sup.nombre === adminSupervisorFilter);
      if (supObj) {
        const assignedIds = supObj.supervisorTiendas || [];
        const isByName = s.supervisorName && s.supervisorName.toLowerCase().trim() === supObj.nombre.toLowerCase().trim();
        if (!assignedIds.includes(s.id) && !isByName) return false;
      }
    }
    if (adminStoreSearch.trim()) {
      const q = adminStoreSearch.toLowerCase();
      return (
        s.nombre.toLowerCase().includes(q) ||
        (s.ciudad && s.ciudad.toLowerCase().includes(q)) ||
        (s.direccion && s.direccion.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="view-container animate-fade">
      {/* Header */}
      <div className="view-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> Panel de Administración
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Control central de accesos, roles, técnicos y red nacional de tiendas.
          </p>
        </div>

        <div>
          {adminSectionTab === 'usuarios' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (showAdminUserForm) handleCancelEditUser();
                setShowAdminUserForm(!showAdminUserForm);
              }}
              style={{ fontWeight: 700, fontSize: '0.84rem', padding: '9px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {showAdminUserForm ? '✕ Cerrar Formulario' : '➕ Nuevo Usuario'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (showAdminStoreForm) handleCancelEditStore();
                setShowAdminStoreForm(!showAdminStoreForm);
              }}
              style={{ fontWeight: 700, fontSize: '0.84rem', padding: '9px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {showAdminStoreForm ? '✕ Cerrar Formulario' : '➕ Nueva Tienda'}
            </button>
          )}
        </div>
      </div>

      {/* 4 Metric Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <div className="detail-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #1e40af', background: 'var(--bg-card)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Usuarios</span>
          <strong style={{ fontSize: '1.3rem', color: 'var(--text-main)', fontFamily: 'Outfit, sans-serif' }}>{users.length}</strong>
        </div>
        <div className="detail-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #3b82f6', background: 'var(--bg-card)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Supervisores</span>
          <strong style={{ fontSize: '1.3rem', color: '#3b82f6', fontFamily: 'Outfit, sans-serif' }}>{users.filter(u => u.rol === 'supervisor').length}</strong>
        </div>
        <div className="detail-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #10b981', background: 'var(--bg-card)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Técnicos</span>
          <strong style={{ fontSize: '1.3rem', color: '#10b981', fontFamily: 'Outfit, sans-serif' }}>{users.filter(u => u.rol === 'tecnico').length}</strong>
        </div>
        <div className="detail-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #f59e0b', background: 'var(--bg-card)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tiendas de la Red</span>
          <strong style={{ fontSize: '1.3rem', color: '#f59e0b', fontFamily: 'Outfit, sans-serif' }}>{stores.length}</strong>
        </div>
      </div>

      {/* Tabs Switcher: Cuentas y Accesos vs Tiendas y Locales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <button
          type="button"
          className={`btn ${adminSectionTab === 'usuarios' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 700, padding: '10px', borderRadius: '12px' }}
          onClick={() => setAdminSectionTab('usuarios')}
        >
          <span>👤 Cuentas y Accesos</span>
          <span style={{ background: adminSectionTab === 'usuarios' ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem' }}>
            {users.length}
          </span>
        </button>
        <button
          type="button"
          className={`btn ${adminSectionTab === 'tiendas' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 700, padding: '10px', borderRadius: '12px' }}
          onClick={() => setAdminSectionTab('tiendas')}
        >
          <span>🏬 Tiendas y Locales</span>
          <span style={{ background: adminSectionTab === 'tiendas' ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem' }}>
            {stores.length}
          </span>
        </button>
      </div>

      {adminSectionTab === 'usuarios' ? (
        <div>
          {/* Formulario de Usuario */}
          {showAdminUserForm && (
            <div className="card animate-fade" style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--primary)', borderRadius: '14px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>
                {editingUserId ? '✏️ Modificar Usuario' : '➕ Registrar Nuevo Usuario'}
              </h3>
              <form onSubmit={handleAdminUserSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={admName}
                    onChange={e => setAdmName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={admEmail}
                    onChange={e => setAdmEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Nombre de Usuario (Login) *</label>
                  <input
                    type="text"
                    required
                    value={admUsername}
                    onChange={e => setAdmUsername(e.target.value)}
                    placeholder="usuario123"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                    {editingUserId ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUserId}
                    value={admContrasena}
                    onChange={e => setAdmContrasena(e.target.value)}
                    placeholder={editingUserId ? 'Dejar en blanco para conservar' : 'Mínimo 6 caracteres'}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Rol en el Sistema *</label>
                  <select
                    value={admRole}
                    onChange={e => setAdmRole(e.target.value as any)}
                    className="custom-select"
                    style={{ width: '100%', fontSize: '0.84rem', padding: '8px 12px', borderRadius: '8px' }}
                  >
                    <option value="jefe_tienda">Tienda / Local</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="tecnico">Técnico Operativo</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>

                {(admRole === 'jefe_tienda' || admRole === 'subjefe') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Tienda Asignada *</label>
                    <select
                      value={admTiendaNombre}
                      onChange={e => setAdmTiendaNombre(e.target.value)}
                      className="custom-select"
                      style={{ width: '100%', fontSize: '0.84rem', padding: '8px 12px', borderRadius: '8px' }}
                    >
                      <option value="">-- Seleccionar Tienda --</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.nombre}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCancelEditUser}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                    {editingUserId ? '💾 Guardar Cambios' : '➕ Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>Filtrar:</span>
            <button
              type="button"
              className={`filter-chip ${adminRoleFilter === 'todos' ? 'active' : ''}`}
              onClick={() => setAdminRoleFilter('todos')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid var(--border-color)', background: adminRoleFilter === 'todos' ? '#1e40af' : 'var(--bg-card)', color: adminRoleFilter === 'todos' ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              👥 Todos <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>{users.length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip ${adminRoleFilter === 'supervisor' ? 'active' : ''}`}
              onClick={() => setAdminRoleFilter('supervisor')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid var(--border-color)', background: adminRoleFilter === 'supervisor' ? '#1e40af' : 'var(--bg-card)', color: adminRoleFilter === 'supervisor' ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              👔 Supervisores <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>{users.filter(u => u.rol === 'supervisor').length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip ${adminRoleFilter === 'tecnico' ? 'active' : ''}`}
              onClick={() => setAdminRoleFilter('tecnico')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid var(--border-color)', background: adminRoleFilter === 'tecnico' ? '#1e40af' : 'var(--bg-card)', color: adminRoleFilter === 'tecnico' ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              👷 Técnicos <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>{users.filter(u => u.rol === 'tecnico').length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip ${adminRoleFilter === 'jefe_tienda' ? 'active' : ''}`}
              onClick={() => setAdminRoleFilter('jefe_tienda')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid var(--border-color)', background: adminRoleFilter === 'jefe_tienda' ? '#1e40af' : 'var(--bg-card)', color: adminRoleFilter === 'jefe_tienda' ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              🏬 Tiendas / Locales <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>{users.filter(u => u.rol === 'jefe_tienda' || u.rol === 'subjefe').length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip ${adminRoleFilter === 'administrador' ? 'active' : ''}`}
              onClick={() => setAdminRoleFilter('administrador')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid var(--border-color)', background: adminRoleFilter === 'administrador' ? '#1e40af' : 'var(--bg-card)', color: adminRoleFilter === 'administrador' ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              🛡️ Admin <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>{users.filter(u => u.rol === 'administrador').length}</span>
            </button>
          </div>

          {/* Search Box */}
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, usuario..."
              value={adminUserSearch}
              onChange={e => setAdminUserSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* User Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredUsers.map(u => {
              const store = stores.find(s => s.id === u.tiendaId);
              const roleIcon = u.rol === 'administrador' ? '🛡️' : u.rol === 'supervisor' ? '👔' : u.rol === 'tecnico' ? '👷' : '🏬';
              const roleLabel = u.rol === 'administrador' ? 'ADMINISTRADOR' : u.rol === 'supervisor' ? 'SUPERVISOR' : u.rol === 'tecnico' ? 'TÉCNICO' : 'TIENDA / LOCAL';
              const roleBadgeBg = u.rol === 'administrador' ? 'rgba(139, 92, 246, 0.12)' : u.rol === 'supervisor' ? 'rgba(59, 130, 246, 0.12)' : u.rol === 'tecnico' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)';
              const roleBadgeColor = u.rol === 'administrador' ? '#7c3aed' : u.rol === 'supervisor' ? '#2563eb' : u.rol === 'tecnico' ? '#059669' : '#d97706';

              return (
                <div key={u.id} className="card animate-fade" style={{ padding: '14px 16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: roleBadgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                        {roleIcon}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{u.nombre}</h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{u.usuario}</span>
                      </div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, background: roleBadgeBg, color: roleBadgeColor, letterSpacing: '0.3px' }}>
                      {roleLabel}
                    </span>
                  </div>

                  <div style={{ margin: '10px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>✉️ {u.correo}</div>
                    {u.rol === 'supervisor' ? (
                      <div 
                        style={{ color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          setAdminSupervisorFilter(u.nombre);
                          setAdminSectionTab('tiendas');
                        }}
                      >
                        🏢 {u.supervisorTiendas ? `${u.supervisorTiendas.length} Tiendas Asignadas` : 'Todas las Tiendas'} →
                      </div>
                    ) : store ? (
                      <div>🏬 {store.nombre}</div>
                    ) : null}
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: u.estado ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {u.estado ? '🟢 Activo' : '🔴 Inactivo'}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px' }}
                        onClick={() => handleStartEditUser(u)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px' }}
                        onClick={() => handleAdminToggleUser(u.id)}
                      >
                        {u.estado ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px' }}
                        onClick={() => handleAdminDeleteUser(u.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* SECCIÓN GESTIÓN DE TIENDAS */
        <div>
          {/* Formulario de Tienda */}
          {showAdminStoreForm && (
            <div className="card animate-fade" style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--primary)', borderRadius: '14px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>
                {editingStoreId ? '✏️ Modificar Tienda' : '➕ Registrar Nueva Tienda'}
              </h3>
              <form onSubmit={handleAdminStoreSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Nombre de Tienda *</label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={e => setNewStoreName(e.target.value)}
                    placeholder="Ej: MARATHON MALL DEL SOL"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Ciudad *</label>
                  <input
                    type="text"
                    required
                    value={newStoreCity}
                    onChange={e => setNewStoreCity(e.target.value)}
                    placeholder="Ej: Guayaquil"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Dirección</label>
                  <input
                    type="text"
                    value={newStoreDir}
                    onChange={e => setNewStoreDir(e.target.value)}
                    placeholder="Ej: Av. Juan Tanca Marengo"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCancelEditStore}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                    {editingStoreId ? '💾 Guardar Cambios' : '➕ Crear Tienda'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Supervisor Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>Supervisor:</span>
            <button
              type="button"
              className={`filter-chip ${adminSupervisorFilter === 'todos' ? 'active' : ''}`}
              onClick={() => setAdminSupervisorFilter('todos')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid var(--border-color)', background: adminSupervisorFilter === 'todos' ? '#1e40af' : 'var(--bg-card)', color: adminSupervisorFilter === 'todos' ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              Todas las Tiendas <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>{stores.length}</span>
            </button>
            {users.filter(u => u.rol === 'supervisor' && u.estado).map(sup => {
              const assignedCount = sup.supervisorTiendas ? sup.supervisorTiendas.length : stores.filter(s => s.supervisorName && s.supervisorName.toLowerCase().trim() === sup.nombre.toLowerCase().trim()).length;
              const isActive = adminSupervisorFilter === sup.nombre;
              return (
                <button
                  key={sup.id}
                  type="button"
                  className={`filter-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setAdminSupervisorFilter(isActive ? 'todos' : sup.nombre)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid var(--border-color)', background: isActive ? '#1e40af' : 'var(--bg-card)', color: isActive ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {sup.nombre.replace('(Supervisor)', '').trim()} <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>{assignedCount}</span>
                </button>
              );
            })}
          </div>

          {/* Store Search Box */}
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, código o ciudad..."
              value={adminStoreSearch}
              onChange={e => setAdminStoreSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Store Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredStores.map(s => {
              const storeSup = users.find(u => u.rol === 'supervisor' && ((u.supervisorTiendas && u.supervisorTiendas.includes(s.id)) || (s.supervisorName && u.nombre.toLowerCase().trim() === s.supervisorName.toLowerCase().trim())));
              const supDisplayName = storeSup ? storeSup.nombre : s.supervisorName || 'Sin asignar';

              return (
                <div key={s.id} className="card animate-fade" style={{ padding: '14px 16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                        🏬
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{s.nombre}</h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📍 {s.ciudad || 'Ecuador'}</span>
                      </div>
                    </div>
                    {s.ciudad && (
                      <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                        {s.ciudad}
                      </span>
                    )}
                  </div>

                  <div style={{ margin: '10px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {s.direccion && <div>📌 {s.direccion}</div>}
                    <div style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      👔 Supervisor: {supDisplayName}
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px' }}
                      onClick={() => handleStartEditStore(s)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px' }}
                      onClick={() => handleAdminDeleteStore(s.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
