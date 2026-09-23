import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import type { User } from './types';

export interface BiometricCheckResult {
  isAvailable: boolean;
  biometryType: string;
  source: 'capacitor' | 'webauthn' | 'none';
}

/**
 * Verifica la disponibilidad de sensores biométricos (Huella, Face ID, Windows Hello)
 * compatible con Android (APK), iPhone (iOS/Safari) y PC (Windows Hello/Mac Touch ID).
 */
export const checkBiometricsAvailability = async (): Promise<BiometricCheckResult> => {
  // 1. Dispositivos Móviles Nativos (Android APK / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await BiometricAuth.checkBiometry();
      if (info && info.isAvailable) {
        let type = 'Huella / Rostro';
        if (info.biometryType === BiometryType.faceId || info.biometryType === BiometryType.faceAuthentication) {
          type = 'Face ID';
        } else if (info.biometryType === BiometryType.touchId || info.biometryType === BiometryType.fingerprintAuthentication) {
          type = 'Huella Dactilar';
        }
        return { isAvailable: true, biometryType: type, source: 'capacitor' };
      }
    } catch (e) {
      console.warn("Capacitor Biometric check warning:", e);
    }
  }

  // 2. Navegadores y PC (Windows Hello, Mac Touch ID, Chrome/Safari WebAuthn)
  if (typeof window !== 'undefined' && window.PublicKeyCredential && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
    try {
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (isAvailable) {
        const ua = navigator.userAgent || '';
        let type = 'Biometría del Dispositivo';
        if (/iPhone|iPad|iPod/i.test(ua)) {
          type = 'Face ID / Touch ID';
        } else if (/Android/i.test(ua)) {
          type = 'Huella Dactilar';
        } else if (/Windows/i.test(ua)) {
          type = 'Windows Hello (Rostro / Huella)';
        } else if (/Mac/i.test(ua)) {
          type = 'Touch ID (Mac)';
        }
        return { isAvailable: true, biometryType: type, source: 'webauthn' };
      }
    } catch (e) {
      console.warn("WebAuthn platform check warning:", e);
    }
  }

  return { isAvailable: false, biometryType: 'No disponible', source: 'none' };
};

/**
 * Guarda y vincula las credenciales del usuario con los datos biométricos del dispositivo
 */
export const saveBiometricCredentials = async (user: User, password?: string): Promise<void> => {
  try {
    const payload = {
      ...user,
      contrasena: password || user.contrasena
    };
    localStorage.setItem('maint_biometric_user', JSON.stringify(payload));
    localStorage.setItem('maint_biometric_configured', 'true');

    // Registro opcional en WebAuthn para navegadores PC/Mac
    if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
        const credential: any = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Mantenimientos Marathon', id: rpId },
            user: {
              id: userId,
              name: user.usuario,
              displayName: user.nombre
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'preferred'
            },
            timeout: 60000
          }
        });

        if (credential && credential.rawId) {
          const rawIdB64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          localStorage.setItem(`maint_webauthn_id_${user.usuario}`, rawIdB64);
        }
      } catch (webauthnErr) {
        // En navegadores que no permitan registro sin interacción directa, continúa transparentemente
        console.log("WebAuthn enrollment info:", webauthnErr);
      }
    }
  } catch (err) {
    console.error("Error guardando credenciales biométricas:", err);
  }
};

/**
 * Autentica al usuario usando el sensor biométrico disponible (Capacitor nativo o WebAuthn)
 */
export const authenticateWithBiometrics = async (
  user: User,
  _biometryType: string
): Promise<{ success: boolean; error?: string }> => {
  // 1. Android APK / iOS nativo
  if (Capacitor.isNativePlatform()) {
    try {
      await BiometricAuth.authenticate({
        reason: `Confirma tu identidad para acceder como ${user.nombre}`,
        cancelTitle: 'Usar contraseña',
        allowDeviceCredential: true,
        androidTitle: 'Acceso Biométrico ManteTiendas',
        androidSubtitle: `Iniciando como ${user.nombre} (@${user.usuario})`
      });
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'userCancel' || err?.code === 'appCancel') {
        return { success: false, error: 'Autenticación cancelada.' };
      }
      return { success: false, error: err?.message || 'No se pudo verificar la identidad biométrica.' };
    }
  }

  // 2. PC / Mac / Web (Windows Hello, Touch ID, WebAuthn)
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const savedCredId = localStorage.getItem(`maint_webauthn_id_${user.usuario}`);

      const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
      const getOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          rpId,
          timeout: 60000,
          userVerification: 'preferred',
          ...(savedCredId ? {
            allowCredentials: [{
              id: Uint8Array.from(atob(savedCredId), c => c.charCodeAt(0)),
              type: 'public-key'
            }]
          } : {})
        }
      };

      const assertion = await navigator.credentials.get(getOptions);
      if (assertion) {
        return { success: true };
      }
    } catch (err: any) {
      console.warn("Fallo o cancelación en WebAuthn:", err);
      if (err.name === 'NotAllowedError') {
        return { success: false, error: 'Acceso biométrico cancelado.' };
      }
      // Si falla WebAuthn pero las credenciales están vinculadas, permitir fallback
      return { success: false, error: 'No se pudo verificar con Windows Hello / Biometría.' };
    }
  }

  return { success: false, error: 'El dispositivo no tiene biometría configurada.' };
};
