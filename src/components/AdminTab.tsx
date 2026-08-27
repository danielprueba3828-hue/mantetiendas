import React from 'react';
import type { Store, User } from '../types';
import { SearchableStoreSelect } from './SearchableStoreSelect';

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
  currentUser: User | null;
  // User Form State
  editingUserId: number | null;
  adminUserName: string;
  setAdminUserName: (val: string) => void;
  adminUserEmail: string;
  setAdminUserEmail: (val: string) => void;
  adminUserLogin: string;
  setAdminUserLogin: (val: string) => void;
  adminUserPass: string;
  setAdminUserPass: (val: string) => void;
  adminUserRole: 'administrador' | 'supervisor' | 'jefe_tienda' | 'subjefe' | 'tecnico';
  setAdminUserRole: (val: 'administrador' | 'supervisor' | 'jefe_tienda' | 'subjefe' | 'tecnico') => void;
  adminUserStoreId: number | '';
  setAdminUserStoreId: (val: number | '') => void;
  adminUserSuperStores: number[];
  setAdminUserSuperStores: React.Dispatch<React.SetStateAction<number[]>>;
  handleAdminUserSubmit: (e: React.FormEvent) => void;
  handleStartEditUser: (u: User) => void;
  handleCancelEditUser: () => void;
  handleAdminDeleteUser: (id: number) => void;
  handleAdminToggleUser: (id: number) => void;
  // Store Form State
  editingStoreId: number | null;
  adminStoreName: string;
  setAdminStoreName: (val: string) => void;
  adminStoreCity: string;
  setAdminStoreCity: (val: string) => void;
  adminStoreAddress: string;
  setAdminStoreAddress: (val: string) => void;
  handleAdminStoreSubmit: (e: React.FormEvent) => void;
  handleStartEditStore: (s: Store) => void;
  handleCancelEditStore: () => void;
  handleAdminDeleteStore: (id: number) => void;
  getUserBadgeText: (u: User) => string;
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
  currentUser,
  editingUserId,
  adminUserName,
  setAdminUserName,
  adminUserEmail,
  setAdminUserEmail,
  adminUserLogin,
  setAdminUserLogin,
  adminUserPass,
  setAdminUserPass,
  adminUserRole,
  setAdminUserRole,
  adminUserStoreId,
  setAdminUserStoreId,
  adminUserSuperStores,
  setAdminUserSuperStores,
  handleAdminUserSubmit,
  handleStartEditUser,
  handleCancelEditUser,
  handleAdminDeleteUser,
  handleAdminToggleUser,
  editingStoreId,
  adminStoreName,
  setAdminStoreName,
  adminStoreCity,
  setAdminStoreCity,
  adminStoreAddress,
  setAdminStoreAddress,
  handleAdminStoreSubmit,
  handleStartEditStore,
  handleCancelEditStore,
  handleAdminDeleteStore,
  getUserBadgeText
}) => {
  return (
    <div className="view-container animate-fade">
      <div className="view-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> Panel de Administración y Configuración
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Gestión integral de usuarios del sistema, asignación de tiendas y catálogos de sucursales
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button"
            className={`btn ${adminSectionTab === 'usuarios' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', fontWeight: 700 }}
            onClick={() => setAdminSectionTab('usuarios')}
          >
            👥 Gestión de Usuarios
          </button>
          <button 
            type="button"
            className={`btn ${adminSectionTab === 'tiendas' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', fontWeight: 700 }}
            onClick={() => setAdminSectionTab('tiendas')}
          >
            🏬 Gestión de Tiendas
          </button>
        </div>
      </div>

      {adminSectionTab === 'usuarios' ? (
        <div>
          {/* Barra de Filtros y Acciones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, usuario o correo..."
                value={adminUserSearch}
                onChange={e => setAdminUserSearch(e.target.value)}
                style={{ flex: 1, minWidth: '180px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              />
              <select
                value={adminRoleFilter}
                onChange={e => setAdminRoleFilter(e.target.value)}
                className="custom-select"
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
              >
                <option value="todos">Todos los Roles</option>
                <option value="administrador">Administradores</option>
                <option value="supervisor">Supervisores</option>
                <option value="jefe_tienda">Jefes de Tienda</option>
                <option value="subjefe">Subjefes de Tienda</option>
                <option value="tecnico">Técnicos</option>
              </select>
              <select
                value={adminSupervisorFilter}
                onChange={e => setAdminSupervisorFilter(e.target.value)}
                className="custom-select"
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
              >
                <option value="todos">Todos los Supervisores</option>
                {users.filter(u => u.rol === 'supervisor' && u.estado).map(sup => (
                  <option key={sup.id} value={sup.nombre}>{sup.nombre}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ fontWeight: 700, fontSize: '0.82rem' }}
              onClick={() => {
                setShowAdminUserForm(!showAdminUserForm);
                if (showAdminUserForm) handleCancelEditUser();
              }}
            >
              {showAdminUserForm ? '✕ Cerrar Formulario' : '➕ Nuevo Usuario'}
            </button>
          </div>

          {/* Formulario de Crear / Editar Usuario */}
          {showAdminUserForm && (
            <div className="card animate-fade" style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--primary-subtle)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>
                {editingUserId ? '✏️ Modificar Usuario' : '➕ Registrar Nuevo Usuario'}
              </h3>
              <form onSubmit={handleAdminUserSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={adminUserName}
                    onChange={e => setAdminUserName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={adminUserEmail}
                    onChange={e => setAdminUserEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Nombre de Usuario (Login) *</label>
                  <input
                    type="text"
                    required
                    value={adminUserLogin}
                    onChange={e => setAdminUserLogin(e.target.value)}
                    placeholder="usuario123"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                    {editingUserId ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUserId}
                    value={adminUserPass}
                    onChange={e => setAdminUserPass(e.target.value)}
                    placeholder={editingUserId ? 'Dejar en blanco para conservar' : 'Mínimo 6 caracteres'}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Rol en el Sistema *</label>
                  <select
                    value={adminUserRole}
                    onChange={e => setAdminUserRole(e.target.value as any)}
                    className="custom-select"
                    style={{ width: '100%', fontSize: '0.82rem', padding: '8px' }}
                  >
                    <option value="administrador">Administrador General</option>
                    <option value="supervisor">Supervisor de Zona</option>
                    <option value="jefe_tienda">Jefe de Tienda</option>
                    <option value="subjefe">Subjefe de Tienda</option>
                    <option value="tecnico">Técnico Operativo</option>
                  </select>
                </div>

                {(adminUserRole === 'jefe_tienda' || adminUserRole === 'subjefe') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Tienda Asignada *</label>
                    <SearchableStoreSelect
                      stores={stores}
                      value={adminUserStoreId}
                      onChange={val => setAdminUserStoreId(val ? Number(val) : '')}
                      currentUser={currentUser}
                      placeholder="Buscar tienda asignada..."
                      allOptionLabel="-- Seleccionar Tienda --"
                      allOptionValue=""
                    />
                  </div>
                )}

                {adminUserRole === 'supervisor' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>
                      Tiendas Bajo su Supervisión ({adminUserSuperStores.length} seleccionadas):
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface)' }}>
                      {stores.map(st => {
                        const isChecked = adminUserSuperStores.includes(st.id);
                        return (
                          <label key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setAdminUserSuperStores(prev => [...prev, st.id]);
                                } else {
                                  setAdminUserSuperStores(prev => prev.filter(id => id !== st.id));
                                }
                              }}
                            />
                            <span>{st.nombre}</span>
                          </label>
                        );
                      })}
                    </div>
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

          {/* Tabla de Usuarios */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 14px' }}>Usuario</th>
                    <th style={{ padding: '12px 14px' }}>Nombre Completo</th>
                    <th style={{ padding: '12px 14px' }}>Correo</th>
                    <th style={{ padding: '12px 14px' }}>Rol</th>
                    <th style={{ padding: '12px 14px' }}>Tienda / Asignación</th>
                    <th style={{ padding: '12px 14px' }}>Estado</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => {
                      if (adminRoleFilter !== 'todos' && u.rol !== adminRoleFilter) return false;
                      if (adminSupervisorFilter !== 'todos') {
                        const supObj = users.find(sup => sup.rol === 'supervisor' && sup.nombre === adminSupervisorFilter);
                        if (supObj) {
                          if (u.rol === 'supervisor' && u.nombre !== adminSupervisorFilter) return false;
                          if (u.tiendaId && (!supObj.supervisorTiendas || !supObj.supervisorTiendas.includes(u.tiendaId))) return false;
                        }
                      }
                      if (adminUserSearch.trim()) {
                        const q = adminUserSearch.toLowerCase();
                        return u.nombre.toLowerCase().includes(q) || u.usuario.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map(u => {
                      const store = stores.find(s => s.id === u.tiendaId);
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700 }}>{u.usuario}</td>
                          <td style={{ padding: '12px 14px' }}>{u.nombre}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{u.correo}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>{u.rol.toUpperCase()}</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {u.rol === 'supervisor' ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                                {u.supervisorTiendas ? `${u.supervisorTiendas.length} Tiendas Asignadas` : 'Todas las Tiendas'}
                              </span>
                            ) : store ? (
                              store.nombre
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span className={`badge ${u.estado ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                              {u.estado ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                onClick={() => handleStartEditUser(u)}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className={`btn ${u.estado ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                onClick={() => handleAdminToggleUser(u.id)}
                              >
                                {u.estado ? '⏸️' : '▶️'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                onClick={() => handleAdminDeleteUser(u.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* SECCIÓN GESTIÓN DE TIENDAS */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar tienda por nombre, ciudad o dirección..."
              value={adminStoreSearch}
              onChange={e => setAdminStoreSearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem' }}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontWeight: 700, fontSize: '0.82rem' }}
              onClick={() => {
                setShowAdminStoreForm(!showAdminStoreForm);
                if (showAdminStoreForm) handleCancelEditStore();
              }}
            >
              {showAdminStoreForm ? '✕ Cerrar Formulario' : '➕ Nueva Tienda'}
            </button>
          </div>

          {showAdminStoreForm && (
            <div className="card animate-fade" style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--primary-subtle)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>
                {editingStoreId ? '✏️ Modificar Tienda' : '➕ Registrar Nueva Tienda'}
              </h3>
              <form onSubmit={handleAdminStoreSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Nombre de Tienda *</label>
                  <input
                    type="text"
                    required
                    value={adminStoreName}
                    onChange={e => setAdminStoreName(e.target.value)}
                    placeholder="Ej: MARATHON MALL DEL SOL"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Ciudad *</label>
                  <input
                    type="text"
                    required
                    value={adminStoreCity}
                    onChange={e => setAdminStoreCity(e.target.value)}
                    placeholder="Ej: Guayaquil"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Dirección</label>
                  <input
                    type="text"
                    value={adminStoreAddress}
                    onChange={e => setAdminStoreAddress(e.target.value)}
                    placeholder="Ej: Av. Juan Tanca Marengo"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }}
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

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 14px' }}>ID</th>
                    <th style={{ padding: '12px 14px' }}>Nombre</th>
                    <th style={{ padding: '12px 14px' }}>Ciudad</th>
                    <th style={{ padding: '12px 14px' }}>Dirección</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {stores
                    .filter(s => {
                      if (adminStoreSearch.trim()) {
                        const q = adminStoreSearch.toLowerCase();
                        return s.nombre.toLowerCase().includes(q) || (s.ciudad && s.ciudad.toLowerCase().includes(q)) || (s.direccion && s.direccion.toLowerCase().includes(q));
                      }
                      return true;
                    })
                    .map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--primary)' }}>#{s.id}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{s.nombre}</td>
                        <td style={{ padding: '12px 14px' }}>{s.ciudad || 'N/A'}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{s.direccion || 'N/A'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() => handleStartEditStore(s)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() => handleAdminDeleteStore(s.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
