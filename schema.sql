-- ==========================================
-- SCHEMA: Sistema de Gestión de Mantenimientos
-- Base de datos: PostgreSQL / Supabase
-- ==========================================

-- 1. Tabla de Tiendas
CREATE TABLE IF NOT EXISTS tiendas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    unidad VARCHAR(20),
    supervisor_nombre VARCHAR(150),
    pausado_por_material BOOLEAN DEFAULT FALSE,
    motivo_pausa_material TEXT,
    fecha_pausa_material TIMESTAMP WITH TIME ZONE,
    materiales_llegaron_tienda BOOLEAN DEFAULT FALSE,
    fecha_llegada_materiales TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contrasena VARCHAR(100),
    rol VARCHAR(30) NOT NULL, -- 'administrador', 'jefe_tienda', 'supervisor', 'tecnico'
    tienda_id INT REFERENCES tiendas(id) ON DELETE SET NULL,
    supervisor_tiendas INT[], -- IDs de tiendas asignadas a un supervisor
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    password_cambiado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Principal de Casos
CREATE TABLE IF NOT EXISTS casos (
    id SERIAL PRIMARY KEY,
    tienda_id INT REFERENCES tiendas(id) ON DELETE CASCADE,
    creado_por INT REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    prioridad_nivel INT NOT NULL, -- 1: Critico, 2: Alto, 3: Medio, 4: Bajo
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'en_proceso', 'concluido', 'cerrado'
    tecnico_asignado_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    tecnico_presencial_nombre VARCHAR(150),
    tecnico_apoyo_nombre VARCHAR(150),
    hora_entrada TIMESTAMP WITH TIME ZONE,
    hora_salida TIMESTAMP WITH TIME ZONE,
    es_caso_tecnico BOOLEAN DEFAULT FALSE,
    tecnico_estatus_trabajo VARCHAR(100),
    reaperturas_count INT DEFAULT 0,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_limite_sla TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Comentarios
CREATE TABLE IF NOT EXISTS comentarios (
    id SERIAL PRIMARY KEY,
    caso_id INT REFERENCES casos(id) ON DELETE CASCADE,
    autor VARCHAR(150) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    texto TEXT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Evidencias
CREATE TABLE IF NOT EXISTS evidencias (
    id SERIAL PRIMARY KEY,
    caso_id INT REFERENCES casos(id) ON DELETE CASCADE,
    subido_por VARCHAR(150) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'inicial', 'final'
    archivo_url TEXT NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    mensaje TEXT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    leida BOOLEAN DEFAULT FALSE,
    tipo VARCHAR(50) NOT NULL,
    tienda_id INT,
    prioridad INT,
    caso_id INT,
    autor_rol VARCHAR(50),
    estado_nuevo VARCHAR(50),
    usuario_id INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Pedidos de Materiales
CREATE TABLE IF NOT EXISTS pedidos_materiales (
    id SERIAL PRIMARY KEY,
    caso_id INT REFERENCES casos(id) ON DELETE CASCADE,
    tecnico_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    estado VARCHAR(30) DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Disponibilidad de Técnicos
CREATE TABLE IF NOT EXISTS disponibilidad_tecnicos (
    id SERIAL PRIMARY KEY,
    tecnico_nombre VARCHAR(150) NOT NULL,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    dias_libres TEXT,
    estatus VARCHAR(50) DEFAULT 'disponible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_casos_tienda ON casos(tienda_id);
CREATE INDEX IF NOT EXISTS idx_casos_estado ON casos(estado);
CREATE INDEX IF NOT EXISTS idx_casos_prioridad ON casos(prioridad_nivel);
CREATE INDEX IF NOT EXISTS idx_casos_tecnico ON casos(tecnico_asignado_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_caso ON comentarios(caso_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_caso ON evidencias(caso_id);


-- 9. Tabla de Catálogo de Materiales y Repuestos
CREATE TABLE IF NOT EXISTS catalogo_materiales (
    id SERIAL PRIMARY KEY,
    categoria VARCHAR(100) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    medidas_specs VARCHAR(150) NOT NULL,
    unidad_medida VARCHAR(50) DEFAULT 'Unidad',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE casos ADD COLUMN IF NOT EXISTS fecha_programada VARCHAR(50);
ALTER TABLE casos ADD COLUMN IF NOT EXISTS turno_programado VARCHAR(100);
ALTER TABLE casos ADD COLUMN IF NOT EXISTS agendado_por VARCHAR(150);

ALTER TABLE casos ADD COLUMN IF NOT EXISTS horas_estimadas INTEGER DEFAULT 2;

ALTER TABLE casos ADD COLUMN IF NOT EXISTS solicitud_material_anticipada BOOLEAN DEFAULT FALSE;
ALTER TABLE casos ADD COLUMN IF NOT EXISTS material_anticipado_nombre TEXT;
ALTER TABLE casos ADD COLUMN IF NOT EXISTS material_anticipado_cantidad INTEGER DEFAULT 1;
ALTER TABLE casos ADD COLUMN IF NOT EXISTS material_anticipado_estado VARCHAR(50);
ALTER TABLE casos ADD COLUMN IF NOT EXISTS material_anticipado_aprobado_por VARCHAR(150);
