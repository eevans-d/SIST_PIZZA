/**
 * Integración AFIP: Validación de DNI/CUIT (Prompt 25)
 * - Validar DNI contra base AFIP
 * - Caching 24 horas
 * - Rate limiting (1 req/2s)
 * - Almacenar en DB con auditoría
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../lib/logger';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

interface DNIValidation {
  dni: string;
  valido: boolean;
  nombre?: string;
  tipo_documento?: string;
  estado?: string;
  cached_at?: string;
}

const _AFIP_API = 'https://servicios1.afip.gob.ar/wfxCert/service.asmx';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
let lastRequestTime = 0;

/**
 * Validar DNI contra AFIP (con caché local)
 */
export async function validarDNI(dni: string): Promise<DNIValidation> {
  // Limpiar y validar formato
  const dniLimpio = dni.replace(/[^0-9]/g, '');

  if (dniLimpio.length < 7 || dniLimpio.length > 8) {
    return {
      dni: dniLimpio,
      valido: false,
    };
  }

  try {
    // 1. Buscar en caché local
    const { data: cached, error: cacheError } = await supabase
      .from('dni_validations')
      .select('*')
      .eq('dni', dniLimpio)
      .single();

    if (!cacheError && cached) {
      const cacheTime = new Date(cached.cached_at).getTime();
      const now = new Date().getTime();

      if (now - cacheTime < CACHE_DURATION) {
        logger.info('[AFIP] DNI desde caché', { dni: dniLimpio });
        return {
          dni: dniLimpio,
          valido: cached.valido,
          nombre: cached.nombre,
          estado: cached.estado,
          cached_at: cached.cached_at,
        };
      }
    }

    // 2. Consultar AFIP (con rate limiting)
    const now = new Date().getTime();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < 2000) {
      // Esperar si es necesario
      await new Promise((resolve) => {
        setTimeout(resolve, 2000 - timeSinceLastRequest);
      });
    }

    lastRequestTime = new Date().getTime();

    // 3. Hacer request a AFIP (mock por ahora - requiere certificado digital)
    const validacion = await consultarAFIP(dniLimpio);

    // 4. Guardar en DB
    if (validacion.valido) {
      await supabase.from('dni_validations').upsert(
        {
          dni: dniLimpio,
          valido: validacion.valido,
          nombre: validacion.nombre,
          estado: validacion.estado,
          cached_at: new Date().toISOString(),
        },
        { onConflict: 'dni' }
      );

      logger.info('[AFIP] DNI validado y cacheado', {
        dni: dniLimpio,
        nombre: validacion.nombre,
      });
    }

    return validacion;
  } catch (error) {
    logger.error('[AFIP] Error validando DNI', { dni: dniLimpio, error });

    return {
      dni: dniLimpio,
      valido: false,
      estado: 'error',
    };
  }
}

/**
 * Consultar API AFIP (mock - requiere certificado digital en prod)
 */
async function consultarAFIP(dni: string): Promise<DNIValidation> {
  // En producción, esto usaría un certificado digital AFIP
  // Para desarrollo, retornamos validación mock

  const esValido = dni.length === 8 && parseInt(dni) > 0;

  if (!esValido) {
    return {
      dni,
      valido: false,
      estado: 'no_encontrado',
    };
  }

  // Mock: generar nombre realista
  const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Roberto'];
  const apellidos = ['González', 'Pérez', 'López', 'Martínez', 'García'];

  const nombre =
    nombres[parseInt(dni.substring(0, 1)) % nombres.length] +
    ' ' +
    apellidos[parseInt(dni.substring(1, 2)) % apellidos.length];

  return {
    dni,
    valido: true,
    nombre,
    estado: 'activo',
  };
}

/**
 * Validar CUIT (formato: XX-XXXXXXXX-X)
 */
export function validarCUIT(cuit: string): boolean {
  const cuitLimpio = cuit.replace(/[^0-9]/g, '');

  if (cuitLimpio.length !== 11) {
    return false;
  }

  // Dígito verificador (módulo 11)
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;

  for (let i = 0; i < 10; i++) {
    suma += parseInt(cuitLimpio[i]) * multiplicadores[i];
  }

  const resto = suma % 11;
  const digito = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;

  return digito === parseInt(cuitLimpio[10]);
}

/**
 * Crear tabla de validaciones si no existe
 */
export async function createDNIValidationTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS dni_validations (
        dni TEXT PRIMARY KEY,
        valido BOOLEAN NOT NULL,
        nombre TEXT,
        estado TEXT,
        cached_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_dni_validations_cached_at
        ON dni_validations(cached_at);
    `,
  });

  if (error) {
    logger.error('[AFIP] Error creando tabla DNI validations', { error });
  }
}
