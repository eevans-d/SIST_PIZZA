/**
 * 🧠 INSTRUCCIONES PARA GITHUB COPILOT:
 * Workflow - Recepción de Mensajes (Prompt 11)
 * - Parsear entrada del usuario
 * - Buscar/crear cliente
 * - Validar zona de cobertura
 * - Escalar si está fuera de zona
 */

import { safeLogger } from '../lib/logger';
import { getSupabaseClient, Cliente, redactarCliente } from '../lib/supabase';
import {
  llamarClaude,
  ContextoClaude,
  FlujoClaude,
  detectarIntencion,
  determinarZona,
  esHorarioLaboral,
} from '../services/claude';
import { chatwootService } from '../services/chatwoot';

/**
 * Resultado del workflow
 */
export interface ResultadoRecepcion {
  clienteId: string;
  mensaje: string;
  accion: 'procesar' | 'escalar_fuera_zona' | 'escalar_horario' | 'error';
  razon?: string;
  conversacionChatwootId?: number;
}

/**
 * Procesar mensaje entrante
 */
export async function procesarMensajeEntrante(
  telefonoEntrada: string,
  mensajeUsuario: string
): Promise<ResultadoRecepcion> {
  try {
    safeLogger.info('Processing incoming message', {
      telefonoUltimos4: `***${telefonoEntrada.slice(-4)}`,
      messageLength: mensajeUsuario.length,
    });


    // ========================================================================
    // 1. BUSCAR O CREAR CLIENTE
    // ========================================================================

    const cliente = await buscarOCrearCliente(telefonoEntrada);

    if (!cliente) {
      safeLogger.error('Failed to get or create client');

      return {
        clienteId: '',
        mensaje: 'No puedo procesar tu solicitud en este momento.',
        accion: 'error',
        razon: 'No se pudo crear cliente en DB',
      };
    }

  const _clienteRedactado = redactarCliente(cliente);

    // ========================================================================
    // 2. VALIDAR HORARIO
    // ========================================================================

    const esHorario = esHorarioLaboral();

    if (!esHorario) {
      safeLogger.info('Outside business hours', {
        cliente_id: cliente.id || 'unknown',
      });

      return {
        clienteId: cliente.id || '',
        mensaje:
          'Hola 👋 Por el momento no estamos atendiendo. Nuestro horario es de 18:00 a 01:00 hs. ¡Nos vemos pronto!',
        accion: 'escalar_horario',
      };
    }

    // ========================================================================
    // 3. CREAR CONVERSACIÓN EN CHATWOOT
    // ========================================================================

    let conversacionId: number | undefined;

    try {
      const conv = await chatwootService.crearConversacion(
        telefonoEntrada,
        cliente.nombre
      );

      if (conv) {
        conversacionId = conv.id;
      }
    } catch (error) {
      safeLogger.warn('Could not create Chatwoot conversation', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // ========================================================================
    // 4. DETECTAR INTENCIÓN Y LLAMAR CLAUDE
    // ========================================================================

    const intencion = detectarIntencion(mensajeUsuario);
    const zona = cliente.direccion ? determinarZona(cliente.direccion) : 'centro';

    // Preparar contexto seguro (sin PII)
    const contexto: ContextoClaude = {
      cliente_tipo: cliente.id ? 'recurrente' : 'nuevo',
      pedidos_previos_count: 0, // TODO: Consultar DB
      zona,
      hora_actual: new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      es_horario_laboral: esHorario,
    };

    // Validar zona de cobertura
    if (zona === 'fuera_cobertura' && intencion === FlujoClaude.TOMA_PEDIDO) {
      safeLogger.info('Client outside coverage area', {
        cliente_id: cliente.id || 'unknown',
        zona,
      });

      return {
        clienteId: cliente.id || '',
        mensaje:
          'Lo siento, tu dirección está fuera de nuestra zona de entrega. Te recomendamos que contactes con un operador.',
        accion: 'escalar_fuera_zona',
        razon: `Fuera de zona: ${zona}`,
        conversacionChatwootId: conversacionId,
      };
    }

    // Llamar Claude
    const respuestaClaude = await llamarClaude(
      mensajeUsuario,
      intencion,
      contexto,
      { maxTokens: 300 }
    );

    safeLogger.info('Message processed successfully', {
      cliente_id: cliente.id || 'unknown',
      accion: 'procesar',
      claudeIntencion: intencion,
    });

    return {
      clienteId: cliente.id || '',
      mensaje: respuestaClaude,
      accion: 'procesar',
      conversacionChatwootId: conversacionId,
    };
  } catch (error) {
    safeLogger.error('Error in procesarMensajeEntrante', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      clienteId: '',
      mensaje:
        'Disculpa, ocurrió un error. Por favor, reintentar o contactar un operador.',
      accion: 'error',
      razon: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Buscar cliente existente o crear uno nuevo
 */
async function buscarOCrearCliente(telefonoEntrada: string): Promise<Cliente | null> {
  const supabase = getSupabaseClient();

  try {
    // Buscar cliente existente
    const { data: clienteExistente, error: errorBusqueda } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefono', telefonoEntrada)
      .maybeSingle();

    if (errorBusqueda) {
      safeLogger.error('Error searching for client', {
        error: errorBusqueda.message,
      });

      return null;
    }

    if (clienteExistente) {
      safeLogger.info('Client found', {
        cliente_id: clienteExistente.id,
      });

      return clienteExistente;
    }

    // Crear nuevo cliente (mínimos datos)
    const { data: clienteNuevo, error: errorCreacion } = await supabase
      .from('clientes')
      .insert({
        nombre: `Cliente ${telefonoEntrada.slice(-4)}`,
        telefono: telefonoEntrada,
        direccion: '[Por confirmar]',
        email: null,
      })
      .select()
      .single();

    if (errorCreacion) {
      safeLogger.error('Error creating client', {
        error: errorCreacion.message,
      });

      return null;
    }

    safeLogger.info('New client created', {
      cliente_id: clienteNuevo.id,
    });

    return clienteNuevo;
  } catch (error) {
    safeLogger.error('Unexpected error in buscarOCrearCliente', {
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}
