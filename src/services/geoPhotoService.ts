/**
 * D&Nax Studios - MaintTrac Geolocation & Photo Watermark Service
 * 
 * Captura coordenadas GPS de alta precisión y estampa una marca de agua
 * indeleble sobre la fotografía para verificación de presencia física en tienda.
 * Requerido exclusivamente para técnicos al iniciar o crear casos.
 */

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  addressHint?: string;
}

export interface WatermarkOptions {
  techName: string;
  storeName?: string;
  actionTitle?: string;
  location: GpsLocation;
}

/**
 * Obtiene las coordenadas GPS actuales del dispositivo con máxima precisión
 */
export async function getCurrentGpsLocation(): Promise<GpsLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tu dispositivo o navegador no soporta geolocalización por GPS."));
      return;
    }

    const tryGetPosition = (highAccuracy: boolean): Promise<GpsLocation> => {
      return new Promise((resolveInner, rejectInner) => {
        try {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolveInner({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp || Date.now()
              });
            },
            (error) => {
              rejectInner(error);
            },
            {
              enableHighAccuracy: highAccuracy,
              timeout: highAccuracy ? 8000 : 10000,
              maximumAge: 60000
            }
          );
        } catch (syncErr) {
          rejectInner(syncErr);
        }
      });
    };

    // Intentar primero alta precisión (satelital); si falla o agota tiempo (común bajo techo en tiendas), fallback a red/antena
    tryGetPosition(true)
      .then(resolve)
      .catch((err1) => {
        console.warn("[GPS] Alta precisión falló o agotó tiempo, intentando ubicación estándar/red...", err1);
        tryGetPosition(false)
          .then(resolve)
          .catch((error: any) => {
            let msg = "No se pudo obtener la ubicación GPS.";
            if (error?.code) {
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  msg = "Permiso de ubicación denegado. Por favor activa la ubicación en los ajustes de tu móvil y permite el acceso a ManteTiendas.";
                  break;
                case error.POSITION_UNAVAILABLE:
                  msg = "Señal de GPS no disponible. Verifica que la ubicación esté encendida en tu dispositivo.";
                  break;
                case error.TIMEOUT:
                  msg = "Tiempo de espera agotado buscando satélites. Puedes reintentar o capturar la foto.";
                  break;
              }
            } else if (error?.message) {
              msg = error.message;
            }
            reject(new Error(msg));
          });
      });
  });
}

/**
 * Aplica una marca de agua indeleble con coordenadas GPS, fecha, hora y datos del técnico
 * directamente sobre el lienzo de la foto antes de almacenarla en la base de datos.
 */
export async function applyGpsWatermark(
  imageSource: File | string,
  options: WatermarkOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const handleImageLoaded = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("No se pudo inicializar el contexto de imagen."));
          return;
        }

        // Redimensionar respetando ratio para optimizar ancho de banda (máx 1280px)
        const MAX_DIM = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 1. Dibujar la fotografía base
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Dibujar banda oscura inferior semi-transparente para alta legibilidad
        const bannerHeight = Math.max(90, Math.round(height * 0.16));
        const gradient = ctx.createLinearGradient(0, height - bannerHeight - 20, 0, height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.3, 'rgba(15, 23, 42, 0.85)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - bannerHeight - 20, width, bannerHeight + 20);

        // Barra de acento D&Nax en el borde superior del banner
        ctx.fillStyle = '#10B981'; // Acento esmeralda de validación
        ctx.fillRect(0, height - bannerHeight - 2, width, 3);

        // 3. Tipografía y Textos de Auditoría
        const fontSizeMain = Math.max(14, Math.round(width * 0.024));
        const fontSizeSub = Math.max(11, Math.round(width * 0.018));
        const paddingLeft = Math.max(16, Math.round(width * 0.025));

        const now = new Date(options.location.timestamp || Date.now());
        const dateStr = now.toLocaleDateString('es-ES', { 
          day: '2-digit', month: '2-digit', year: 'numeric' 
        });
        const timeStr = now.toLocaleTimeString('es-ES', { 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });

        const latFormatted = options.location.latitude.toFixed(6);
        const lngFormatted = options.location.longitude.toFixed(6);
        const accuracyFormatted = options.location.accuracy ? `±${Math.round(options.location.accuracy)}m` : 'Preciso';

        let currentY = height - bannerHeight + fontSizeMain + 6;

        // Línea 1: Ubicación GPS con Badge
        ctx.font = `bold ${fontSizeMain}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#34D399'; // Verde satélite
        ctx.fillText(`📍 GPS: ${latFormatted}, ${lngFormatted} (${accuracyFormatted})`, paddingLeft, currentY);

        // Badge a la derecha
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FCD34D'; // Amarillo auditoría
        ctx.fillText(`🛡️ VERIFICADO EN CAMPO`, width - paddingLeft, currentY);
        ctx.textAlign = 'left';

        // Línea 2: Fecha, Hora y Acción
        currentY += fontSizeSub + 10;
        ctx.font = `${fontSizeSub}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        const actionText = options.actionTitle ? ` • ${options.actionTitle}` : '';
        ctx.fillText(`📅 ${dateStr} ${timeStr}${actionText}`, paddingLeft, currentY);

        // Línea 3: Técnico y Tienda
        currentY += fontSizeSub + 8;
        ctx.fillStyle = '#E2E8F0';
        const storeText = options.storeName ? ` en ${options.storeName}` : '';
        ctx.fillText(`👷 Téc: ${options.techName}${storeText}`, paddingLeft, currentY);

        // Firma D&Nax MaintTrac
        ctx.textAlign = 'right';
        ctx.fillStyle = '#94A3B8';
        ctx.font = `600 ${fontSizeSub - 1}px monospace`;
        ctx.fillText(`D&Nax Studios MaintTrac`, width - paddingLeft, currentY);

        // 4. Exportar imagen comprimida de alta calidad en JPEG
        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(watermarkedDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onload = handleImageLoaded;

    img.onerror = () => {
      reject(new Error("No se pudo procesar la imagen seleccionada."));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Error leyendo el archivo fotográfico."));
      reader.readAsDataURL(imageSource);
    }
  });
}
