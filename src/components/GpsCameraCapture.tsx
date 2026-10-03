import React, { useState, useEffect, useRef, useId } from 'react';
import { getCurrentGpsLocation, applyGpsWatermark, type GpsLocation } from '../services/geoPhotoService';

interface GpsCameraCaptureProps {
  photoUrl: string | null;
  onPhotoCaptured: (watermarkedUrl: string, location: GpsLocation) => void;
  onPhotoRemoved: () => void;
  techName: string;
  storeName?: string;
  actionTitle?: string;
  required?: boolean;
  label?: string;
}

export const GpsCameraCapture: React.FC<GpsCameraCaptureProps> = ({
  photoUrl,
  onPhotoCaptured,
  onPhotoRemoved,
  techName,
  storeName,
  actionTitle,
  required = true,
  label = "Foto con Coordenadas GPS (Obligatorio para Técnicos)"
}) => {
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GpsLocation | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uniqueInputId = useId();

  // Solicitar coordenadas al montar para agilizar la toma de foto de forma segura
  useEffect(() => {
    let isMounted = true;
    const initLocation = async () => {
      setIsGettingGps(true);
      setGpsError(null);
      try {
        const loc = await getCurrentGpsLocation();
        if (isMounted) {
          setGpsLocation(loc);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("[GpsCameraCapture] Ubicación no detectada automáticamente:", err);
          setGpsError(err.message || "Activa el GPS en tu móvil para una mejor precisión.");
        }
      } finally {
        if (isMounted) {
          setIsGettingGps(false);
        }
      }
    };

    initLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchLocation = async () => {
    setIsGettingGps(true);
    setGpsError(null);
    try {
      const loc = await getCurrentGpsLocation();
      setGpsLocation(loc);
    } catch (err: any) {
      console.warn("[GpsCameraCapture] Reintento de GPS falló:", err);
      setGpsError(err.message || "No se pudo obtener la ubicación GPS.");
    } finally {
      setIsGettingGps(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);

    try {
      let loc = gpsLocation;
      if (!loc) {
        setIsGettingGps(true);
        try {
          loc = await getCurrentGpsLocation();
          setGpsLocation(loc);
        } catch (locErr: any) {
          console.warn("[GpsCameraCapture] Fallback a coordenadas de emergencia:", locErr);
          // Si el GPS falla completamente (sótano, sin señal), no bloquear la app
          loc = {
            latitude: 0,
            longitude: 0,
            accuracy: 9999,
            timestamp: Date.now(),
            addressHint: "Sin señal satelital en tienda"
          };
          setGpsError("Foto registrada sin señal GPS directa (sótano o cobertura limitada).");
        } finally {
          setIsGettingGps(false);
        }
      }

      // Aplicar marca de agua sobre el canvas
      const watermarked = await applyGpsWatermark(file, {
        techName: techName || 'Técnico',
        storeName: storeName || 'En Tienda',
        actionTitle: actionTitle || 'Validación de Campo',
        location: loc
      });

      onPhotoCaptured(watermarked, loc);
    } catch (err: any) {
      console.error("[GpsCameraCapture] Error procesando foto con GPS:", err);
      alert(err.message || "No pudimos procesar la foto. Por favor intenta de nuevo.");
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{
      background: 'var(--bg-surface, rgba(255, 255, 255, 0.03))',
      border: photoUrl ? '1.5px solid #10b981' : '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* HEADER & STATUS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>📷</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {label.replace(/(\(Obligatorio.*?\)|📸)/gi, '').trim() || 'Foto de Asistencia'}
              </span>
              {required && (
                <span style={{ 
                  color: 'var(--text-muted)', 
                  fontSize: '0.75rem', 
                  fontWeight: 600
                }}>
                  (Obligatorio)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* GPS CHIP - SIMPLE & TRANQUIL */}
        <div>
          {isGettingGps ? (
            <span style={{ 
              fontSize: '0.78rem', 
              color: 'var(--text-muted)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'var(--bg-panel)'
            }}>
              <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }} />
              Detectando ubicación...
            </span>
          ) : gpsLocation && gpsLocation.latitude !== 0 ? (
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              ✓ Ubicación lista
            </span>
          ) : (
            <button
              type="button"
              onClick={fetchLocation}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              ⚠️ Reintentar señal
            </button>
          )}
        </div>
      </div>

      {gpsError && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          color: '#d97706',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <span>Nota: {gpsError}</span>
          <button
            type="button"
            onClick={fetchLocation}
            style={{
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* PREVIEW OR CAPTURE BUTTON */}
      {photoUrl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000', maxHeight: '200px' }}>
            <img
              src={photoUrl}
              alt="Foto capturada"
              style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: 'rgba(16, 185, 129, 0.95)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              ✓ Foto con ubicación guardada
            </div>
          </div>

          <button
            type="button"
            onClick={onPhotoRemoved}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '10px'
            }}
          >
            🔄 Tomar otra foto
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          padding: '18px 14px',
          background: 'var(--bg-panel)',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid var(--border-color)'
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id={`gps-camera-input-${uniqueInputId}`}
          />

          <label
            htmlFor={`gps-camera-input-${uniqueInputId}`}
            style={{
              background: isProcessingPhoto ? 'var(--text-muted)' : 'var(--primary, #3B82F6)',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: isProcessingPhoto ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              maxWidth: '300px',
              minHeight: '48px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
              transition: 'transform 0.15s ease',
              touchAction: 'manipulation'
            }}
          >
            {isProcessingPhoto ? (
              <>⏳ Procesando foto...</>
            ) : (
              <>📷 Tomar Foto con la Cámara</>
            )}
          </label>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Toma una foto de la tienda o fachada para validar tu asistencia.
          </span>
        </div>
      )}
    </div>
  );
};
