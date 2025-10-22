# 🏗️ SIST_PIZZA - ARQUITECTURA MODULAR V2.0

> **Fecha:** 22 de Octubre 2025  
> **Estrategia:** Híbrida - Código actual + Componentes Open Source  
> **Objetivo:** MVP funcional en 15-20 horas dividido en 6 módulos independientes

---

## 📊 ANÁLISIS DE DECISIÓN

### ✅ LO QUE YA TENEMOS (No Reinventar)
- Backend Node.js/TypeScript (4,076 líneas) - 85% completo
- Frontend React/Vite PWA (1,201 líneas) - 80% completo
- 48 tests pasando (backend + frontend)
- Supabase schema + migrations (394 líneas SQL)
- Docker configs (Dockerfile.backend, Dockerfile.frontend)
- Kubernetes manifests (5 archivos)
- Monitoring setup (Prometheus + Grafana)

### 🔄 LO QUE REEMPLAZAREMOS (Adoptar OSS)
- ❌ Chatbot Claude custom → **N8N Template para restaurantes**
- ❌ Webhook handlers complejos → **N8N workflows visuales**
- ❌ Validaciones manuales → **N8N + Claude integrado**
- ❌ Admin panel básico → **Agregar Retool/Refine.dev**

### ➕ LO QUE AGREGAREMOS (Nuevos Módulos)
- ✅ N8N self-hosted con templates
- ✅ Chatwoot como hub multi-canal
- ✅ WAHA (WhatsApp HTTP API)
- ✅ PrintNode para comandas físicas
- ✅ Admin panel avanzado (Retool o Refine.dev)

---

## 🧩 ARQUITECTURA MODULAR (6 MÓDULOS)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIST_PIZZA V2 - 6 MÓDULOS                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MÓDULO 1: CANALES DE ENTRADA (Conversacional)                  │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│ │  WhatsApp   │→ │  Chatwoot   │→ │     N8N     │            │
│ │   (WAHA)    │  │   (Hub)     │  │  (Orquest.) │            │
│ └─────────────┘  └─────────────┘  └─────────────┘            │
│     ↓                                       ↓                   │
│ [Cliente envía: "Quiero 2 muzza + coca"]  [Claude procesa]    │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ MÓDULO 2: BACKEND CORE (Node.js - TU CÓDIGO)                   │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │  Express API (REST)                                       │  │
│ │  • POST /api/comandas - Crear pedido                      │  │
│ │  • GET  /api/comandas/:id - Consultar estado             │  │
│ │  • PUT  /api/comandas/:id - Actualizar                   │  │
│ │  • POST /api/pagos/modo - Procesar pago                  │  │
│ └──────────────────────────────────────────────────────────┘  │
│                             ↓                                   │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │  Business Logic (Services)                                │  │
│ │  • Cálculo de totales + delivery                          │  │
│ │  • Validación de zonas                                    │  │
│ │  • SLA por horario                                        │  │
│ │  • Compliance (GDPR, PII)                                 │  │
│ └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ MÓDULO 3: PERSISTENCIA (Supabase)                              │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │  PostgreSQL + RLS                                         │  │
│ │  • clientes                                               │  │
│ │  • menu_items                                             │  │
│ │  • pedidos                                                │  │
│ │  • detalle_pedidos                                        │  │
│ │  • zonas_entrega                                          │  │
│ │  • audit_logs                                             │  │
│ │  • support_tickets                                        │  │
│ └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ MÓDULO 4: INTEGRACIONES EXTERNAS                               │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│ │    MODO     │  │  PrintNode  │  │    AFIP     │            │
│ │   (Pagos)   │  │  (Impre.)   │  │   (DNI)     │            │
│ └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ MÓDULO 5: FRONTEND (React PWA)                                 │
│ ┌───────────────────┐  ┌───────────────────┐                  │
│ │  PWA Cocina       │  │  PWA Cliente      │                  │
│ │  • Display órdenes│  │  • Menú           │                  │
│ │  • Notificación   │  │  • Carrito        │                  │
│ │  • Timers SLA     │  │  • Tracking       │                  │
│ └───────────────────┘  └───────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ MÓDULO 6: ADMIN & OBSERVABILITY                                │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│ │   Retool    │  │ Prometheus  │  │   Grafana   │            │
│ │   (Admin)   │  │  (Metrics)  │  │ (Dashboard) │            │
│ └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 MÓDULO 1: CANALES DE ENTRADA (Conversacional)

### 🎯 Objetivo
Recibir pedidos por WhatsApp, procesarlos con IA y enviarlos al backend

### 🛠️ Componentes

#### 1.1 WAHA (WhatsApp HTTP API)
- **Descripción:** Servidor que expone WhatsApp Business API vía HTTP
- **GitHub:** https://github.com/devlikeapro/waha
- **Instalación:** Docker Compose
- **Configuración:**
  ```yaml
  waha:
    image: devlikeapro/waha:latest
    ports:
      - "3001:3000"
    environment:
      - WHATSAPP_HOOK_URL=http://chatwoot:3000/api/v1/webhooks/whatsapp
  ```

#### 1.2 Chatwoot (Hub Multi-Canal)
- **Descripción:** Plataforma de soporte con inbox unificado
- **GitHub:** https://github.com/chatwoot/chatwoot
- **Instalación:** Docker Compose o Cloud (chatwoot.com)
- **Integraciones:**
  - WhatsApp vía WAHA
  - Telegram
  - Email
  - Live Chat (web)

#### 1.3 N8N (Orquestación + IA)
- **Descripción:** Low-code automation con templates para restaurantes
- **Template específico:** https://n8n.io/workflows/3043
- **Workflow:**
  ```
  1. Webhook recibe mensaje de Chatwoot
  2. Extrae texto del cliente
  3. Envía a Claude API (prompt: "Extraer pedido de pizza")
  4. Claude responde JSON: { items: [...], direccion: "...", telefono: "..." }
  5. Validar datos (Zod schema)
  6. POST a tu backend: /api/comandas
  7. Responder al cliente con confirmación
  ```

### 📋 Tareas Módulo 1 (6 horas)

#### Tarea 1.1: Instalar WAHA (30 min)
```bash
# Agregar a docker-compose.yml
docker-compose up waha -d
# Vincular número de WhatsApp Business
# Verificar: curl http://localhost:3001/api/status
```

#### Tarea 1.2: Instalar Chatwoot (1 hora)
```bash
# Opción A: Docker local
docker-compose up chatwoot -d

# Opción B: Cloud (más rápido)
# 1. Crear cuenta en chatwoot.com
# 2. Crear inbox de WhatsApp
# 3. Conectar con WAHA webhook
```

#### Tarea 1.3: Configurar N8N (2 horas)
```bash
# Instalar N8N
docker-compose up n8n -d

# Importar template
# 1. Acceder a http://localhost:5678
# 2. Importar workflow desde URL
# 3. Configurar credenciales:
#    - Chatwoot API Token
#    - Claude API Key (ANTHROPIC_API_KEY)
#    - Backend URL (http://backend:3000)
```

#### Tarea 1.4: Crear Prompt Claude para Pedidos (1 hora)
```javascript
// Prompt en N8N node "Claude AI"
const systemPrompt = `
Eres un asistente de pizzería en Necochea, Argentina.
Tu tarea es extraer información de pedidos de mensajes de clientes.

MENÚ:
- Muzzarella: $5000
- Napolitana: $6000
- Fugazzeta: $6500
- Calabresa: $7000

FORMATO DE SALIDA (JSON):
{
  "items": [{ "nombre": "Muzzarella", "cantidad": 2 }],
  "direccion": "Calle 50 #123",
  "telefono": "2262123456",
  "notas": "Sin aceitunas",
  "valido": true,
  "razon": ""
}

Si falta información, responde con valido: false y razon con lo que falta.
`;

// Ejemplo input: "Hola! Quiero 2 muzza y 1 napo para calle 50 123, tel 2262123456"
// Output esperado: JSON con items parseados
```

#### Tarea 1.5: Integrar N8N con Backend (1 hora)
```javascript
// N8N Node: HTTP Request
// POST http://backend:3000/api/comandas
// Body:
{
  "cliente": {
    "nombre": "{{ $json.nombre }}",
    "telefono": "{{ $json.telefono }}",
    "direccion": "{{ $json.direccion }}"
  },
  "items": "{{ $json.items }}",
  "notas": "{{ $json.notas }}",
  "origen": "whatsapp"
}
```

#### Tarea 1.6: Testing E2E Canal WhatsApp (30 min)
```bash
# Test manual:
# 1. Enviar mensaje por WhatsApp: "Quiero 2 muzza"
# 2. Verificar en Chatwoot inbox
# 3. Verificar en N8N execution log
# 4. Verificar en backend: GET /api/comandas
# 5. Verificar respuesta al cliente en WhatsApp
```

### ✅ Criterios de Aceptación Módulo 1
- [ ] WAHA conectado y recibiendo mensajes de WhatsApp
- [ ] Chatwoot muestra mensajes en inbox
- [ ] N8N workflow ejecuta al recibir mensaje
- [ ] Claude procesa pedido y responde JSON válido
- [ ] Backend recibe POST y crea orden en Supabase
- [ ] Cliente recibe confirmación automática en WhatsApp

---

## 📦 MÓDULO 2: BACKEND CORE (Node.js)

### 🎯 Objetivo
API REST robusta con lógica de negocio, ya implementada (tu código actual)

### 🛠️ Estado Actual
- ✅ Express server configurado
- ✅ 9 workflows implementados
- ✅ Supabase client configurado
- ✅ Middlewares de validación
- ✅ Logger Winston
- ✅ Métricas Prometheus

### 🔧 Mejoras Necesarias

#### 2.1 Simplificar Configuración (CRÍTICO)
**Problema actual:** Validación muy estricta en `config/validate.ts`

**Solución:**
```typescript
// backend/src/config/index.ts
import { z } from 'zod';

const envSchema = z.object({
  // Supabase (REQUERIDO)
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // Claude (OPCIONAL en dev)
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // MODO (OPCIONAL - usar mock si no existe)
  MODO_API_KEY: z.string().optional(),
  
  // Otros opcionales
  CHATWOOT_API_KEY: z.string().optional(),
  DB_ENCRYPTION_KEY: z.string().optional(),
});

export const config = envSchema.parse(process.env);

// Exports con fallbacks
export const isModoEnabled = !!config.MODO_API_KEY;
export const isClaudeEnabled = !!config.ANTHROPIC_API_KEY;
```

#### 2.2 Endpoint de Health Check (ya existe, mejorar)
```typescript
// backend/src/server.ts
app.get('/api/health', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    database: 'checking...',
    integrations: {
      supabase: false,
      claude: isClaudeEnabled,
      modo: isModoEnabled,
    }
  };
  
  try {
    // Verificar conexión Supabase
    await supabase.from('menu_items').select('count').limit(1);
    checks.database = 'ok';
    checks.integrations.supabase = true;
  } catch (error) {
    checks.database = 'error';
  }
  
  res.json(checks);
});
```

#### 2.3 Webhook para N8N
```typescript
// backend/src/workflows/recibirPedidoN8N.ts
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const pedidoN8NSchema = z.object({
  cliente: z.object({
    nombre: z.string().optional(),
    telefono: z.string().min(10),
    direccion: z.string().min(5),
  }),
  items: z.array(z.object({
    nombre: z.string(),
    cantidad: z.number().int().positive(),
  })),
  notas: z.string().optional(),
  origen: z.enum(['whatsapp', 'telegram', 'web']).default('whatsapp'),
});

router.post('/api/webhooks/n8n/pedido', async (req, res) => {
  try {
    const data = pedidoN8NSchema.parse(req.body);
    
    // 1. Buscar o crear cliente
    let cliente = await supabase
      .from('clientes')
      .select()
      .eq('telefono', data.cliente.telefono)
      .single();
    
    if (!cliente.data) {
      const { data: nuevoCliente } = await supabase
        .from('clientes')
        .insert({
          nombre: data.cliente.nombre || `Cliente ${data.cliente.telefono}`,
          telefono: data.cliente.telefono,
          direccion: data.cliente.direccion,
        })
        .select()
        .single();
      cliente.data = nuevoCliente;
    }
    
    // 2. Buscar items del menú
    const itemsConPrecios = await Promise.all(
      data.items.map(async (item) => {
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select()
          .ilike('nombre', `%${item.nombre}%`)
          .limit(1)
          .single();
        
        if (!menuItem) throw new Error(`Item no encontrado: ${item.nombre}`);
        
        return {
          menu_item_id: menuItem.id,
          cantidad: item.cantidad,
          precio_unitario: menuItem.precio,
          subtotal: menuItem.precio * item.cantidad,
        };
      })
    );
    
    // 3. Calcular total
    const subtotal = itemsConPrecios.reduce((sum, item) => sum + item.subtotal, 0);
    const costoEnvio = 500; // TODO: calcular por zona
    const total = subtotal + costoEnvio;
    
    // 4. Crear pedido
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: cliente.data.id,
        estado: 'pendiente',
        tipo_entrega: 'delivery',
        direccion_entrega: data.cliente.direccion,
        total,
        metodo_pago: 'pendiente',
        notas: data.notas,
        origen: data.origen,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 5. Crear detalles
    await supabase
      .from('detalle_pedidos')
      .insert(
        itemsConPrecios.map(item => ({
          pedido_id: pedido.id,
          ...item,
        }))
      );
    
    // 6. Responder
    res.json({
      success: true,
      pedido_id: pedido.id,
      total,
      mensaje: `Pedido #${pedido.id} creado. Total: $${total}. Tiempo estimado: 30-40 min.`,
    });
    
  } catch (error) {
    console.error('Error en webhook N8N:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

### 📋 Tareas Módulo 2 (4 horas)

#### Tarea 2.1: Simplificar Config (30 min)
- [ ] Modificar `backend/src/config/validate.ts`
- [ ] Hacer opcionales: Claude, MODO, Chatwoot
- [ ] Solo requerir: Supabase credentials
- [ ] Recompilar: `npm run build`

#### Tarea 2.2: Mejorar Health Check (15 min)
- [ ] Agregar checks de integraciones
- [ ] Test: `curl http://localhost:3000/api/health`

#### Tarea 2.3: Crear Webhook para N8N (1 hora)
- [ ] Implementar `/api/webhooks/n8n/pedido`
- [ ] Test con Postman/curl

#### Tarea 2.4: Levantar Backend Local (30 min)
```bash
cd backend
npm run dev
# Verificar logs sin errores
```

#### Tarea 2.5: Tests de Integración (1 hora)
```bash
# Test crear pedido desde N8N
curl -X POST http://localhost:3000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "telefono": "2262123456",
      "direccion": "Calle 50 #123"
    },
    "items": [
      { "nombre": "Muzzarella", "cantidad": 2 }
    ]
  }'
```

#### Tarea 2.6: Documentar API (30 min)
- [ ] Crear `BACKEND_API.md` con endpoints
- [ ] Ejemplos de requests/responses

### ✅ Criterios de Aceptación Módulo 2
- [ ] Backend levanta sin errores
- [ ] `/api/health` responde 200 OK
- [ ] Webhook N8N crea pedidos correctamente
- [ ] Tests unitarios pasan
- [ ] Documentación API completa

---

## 📦 MÓDULO 3: PERSISTENCIA (Supabase)

### 🎯 Objetivo
Base de datos configurada con datos reales del menú

### 🛠️ Estado Actual
- ✅ Schema SQL creado (230 líneas)
- ✅ Seed data con 10 pizzas (164 líneas)
- ✅ RLS policies configuradas
- ✅ Migraciones listas

### 📋 Tareas Módulo 3 (2 horas)

#### Tarea 3.1: Crear Proyecto Supabase (15 min)
1. Ir a https://supabase.com
2. Crear cuenta
3. New Project: "sist-pizza-prod"
4. Region: South America (São Paulo)
5. Copiar credenciales

#### Tarea 3.2: Ejecutar Migraciones (30 min)
1. SQL Editor → New Query
2. Copiar `supabase/migrations/20250115000000_initial_schema.sql`
3. Run
4. Verificar tablas creadas

#### Tarea 3.3: Cargar Seed Data (15 min)
1. SQL Editor → New Query
2. Copiar `supabase/migrations/20250115000001_seed_data.sql`
3. Run
4. Verificar en Table Editor: `menu_items` tiene datos

#### Tarea 3.4: Configurar .env (15 min)
```bash
# backend/.env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# frontend/.env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Tarea 3.5: Test de Conexión (15 min)
```bash
# Desde backend
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
supabase.from('menu_items').select('nombre, precio').then(console.log);
"
```

#### Tarea 3.6: Crear Vista para Dashboard (30 min)
```sql
-- Vista para analíticas
CREATE VIEW pedidos_dashboard AS
SELECT 
  DATE(p.created_at) AS fecha,
  COUNT(*) AS total_pedidos,
  SUM(p.total) AS total_ventas,
  AVG(p.total) AS ticket_promedio,
  COUNT(CASE WHEN p.estado = 'entregado' THEN 1 END) AS entregados,
  COUNT(CASE WHEN p.estado = 'cancelado' THEN 1 END) AS cancelados
FROM pedidos p
GROUP BY DATE(p.created_at)
ORDER BY fecha DESC;
```

### ✅ Criterios de Aceptación Módulo 3
- [ ] Proyecto Supabase creado
- [ ] Todas las tablas existen
- [ ] Datos de menú cargados
- [ ] Backend se conecta correctamente
- [ ] Queries de prueba funcionan

---

## 📦 MÓDULO 4: INTEGRACIONES EXTERNAS

### 🎯 Objetivo
Conectar con servicios de pago, impresión y validación

### 🛠️ Integraciones

#### 4.1 MODO (Pagos Argentina)

**Implementación:**
```typescript
// backend/src/services/modo.ts
import axios from 'axios';

interface ModoPaymentRequest {
  amount: number;
  description: string;
  externalReference: string; // pedido_id
  callbackUrl: string;
}

export class ModoService {
  private apiKey: string;
  private baseUrl = 'https://api.modo.com.ar/v1';
  
  async createPayment(data: ModoPaymentRequest) {
    if (!config.MODO_API_KEY) {
      // Mock para desarrollo
      return {
        paymentId: 'mock-' + Date.now(),
        checkoutUrl: 'https://mock-checkout.modo.com',
        status: 'pending',
      };
    }
    
    const response = await axios.post(
      `${this.baseUrl}/payments`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${config.MODO_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  }
  
  async getPaymentStatus(paymentId: string) {
    // Similar con mock
  }
}
```

#### 4.2 PrintNode (Impresión Comandas)

```typescript
// backend/src/services/printnode.ts
import axios from 'axios';

export class PrintNodeService {
  private apiKey: string;
  private printerId: number;
  
  async printComanda(pedido: any) {
    const content = `
=====================================
      🍕 PIZZERÍA NECOCHEA 🍕
=====================================
Pedido #${pedido.id}
Fecha: ${new Date().toLocaleString('es-AR')}
-------------------------------------
Cliente: ${pedido.cliente.nombre}
Tel: ${pedido.cliente.telefono}
Dirección: ${pedido.direccion_entrega}
-------------------------------------
ITEMS:
${pedido.items.map(i => `${i.cantidad}x ${i.nombre} - $${i.subtotal}`).join('\n')}
-------------------------------------
TOTAL: $${pedido.total}
=====================================
    `;
    
    await axios.post(
      'https://api.printnode.com/printjobs',
      {
        printerId: this.printerId,
        title: `Pedido ${pedido.id}`,
        contentType: 'pdf_uri' | 'raw_base64',
        content: Buffer.from(content).toString('base64'),
      },
      {
        auth: {
          username: this.apiKey,
          password: '',
        },
      }
    );
  }
}
```

#### 4.3 AFIP DNI Validation (Mock)

```typescript
// backend/src/services/afip.ts
export class AFIPService {
  async validateDNI(dni: string): Promise<boolean> {
    // En producción, usar API AFIP Padrón
    // Por ahora: validación de formato
    return /^\d{7,8}$/.test(dni);
  }
}
```

### 📋 Tareas Módulo 4 (3 horas)

#### Tarea 4.1: Integración MODO (1 hora)
- [ ] Crear cuenta en modo.com.ar
- [ ] Obtener API key de prueba
- [ ] Implementar servicio MODO
- [ ] Test crear pago
- [ ] Implementar webhook de confirmación

#### Tarea 4.2: PrintNode Setup (1 hora)
- [ ] Crear cuenta printnode.com
- [ ] Vincular impresora térmica
- [ ] Test imprimir comanda de prueba
- [ ] Integrar en workflow de pedidos

#### Tarea 4.3: AFIP Mock (30 min)
- [ ] Implementar validación básica DNI
- [ ] Agregar a proceso de validación cliente

#### Tarea 4.4: Circuit Breaker (30 min)
```typescript
// Patron circuit breaker para integraciones
class CircuitBreaker {
  private failures = 0;
  private threshold = 5;
  private timeout = 60000; // 1 min
  
  async execute(fn: () => Promise<any>) {
    if (this.failures >= this.threshold) {
      throw new Error('Circuit breaker OPEN');
    }
    
    try {
      const result = await fn();
      this.failures = 0; // reset
      return result;
    } catch (error) {
      this.failures++;
      throw error;
    }
  }
}
```

### ✅ Criterios de Aceptación Módulo 4
- [ ] Modo crea pagos (o mock funciona)
- [ ] PrintNode imprime comandas
- [ ] AFIP valida DNIs
- [ ] Circuit breakers implementados
- [ ] Logs de errores capturados

---

## 📦 MÓDULO 5: FRONTEND (React PWA)

### 🎯 Objetivo
Interfaz para cocina y clientes

### 🛠️ Componentes

#### 5.1 PWA Cocina (Display de Órdenes)

```tsx
// frontend/src/pages/Comandas.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function Comandas() {
  const [pedidos, setPedidos] = useState([]);
  
  useEffect(() => {
    // Cargar pedidos iniciales
    loadPedidos();
    
    // Suscripción realtime
    const subscription = supabase
      .channel('pedidos')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
      }, (payload) => {
        console.log('Nuevo pedido:', payload);
        loadPedidos();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  async function loadPedidos() {
    const { data } = await supabase
      .from('pedidos')
      .select(`
        *,
        cliente:clientes(*),
        items:detalle_pedidos(*, menu_item:menu_items(*))
      `)
      .in('estado', ['pendiente', 'en_preparacion'])
      .order('created_at', { ascending: true });
    
    setPedidos(data || []);
  }
  
  async function cambiarEstado(pedidoId: string, nuevoEstado: string) {
    await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedidoId);
    
    loadPedidos();
  }
  
  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {/* Columna: Pendientes */}
      <div className="bg-yellow-50">
        <h2 className="text-xl font-bold p-2">⏳ Pendientes</h2>
        {pedidos
          .filter(p => p.estado === 'pendiente')
          .map(pedido => (
            <PedidoCard key={pedido.id} pedido={pedido} onCambiar={cambiarEstado} />
          ))}
      </div>
      
      {/* Columna: En Preparación */}
      <div className="bg-blue-50">
        <h2 className="text-xl font-bold p-2">👨‍🍳 En Cocina</h2>
        {pedidos
          .filter(p => p.estado === 'en_preparacion')
          .map(pedido => (
            <PedidoCard key={pedido.id} pedido={pedido} onCambiar={cambiarEstado} />
          ))}
      </div>
      
      {/* Columna: Listos */}
      <div className="bg-green-50">
        <h2 className="text-xl font-bold p-2">✅ Listos</h2>
        {pedidos
          .filter(p => p.estado === 'listo')
          .map(pedido => (
            <PedidoCard key={pedido.id} pedido={pedido} onCambiar={cambiarEstado} />
          ))}
      </div>
    </div>
  );
}

function PedidoCard({ pedido, onCambiar }) {
  const tiempoTranscurrido = Math.floor((Date.now() - new Date(pedido.created_at)) / 60000);
  const colorSLA = tiempoTranscurrido > 30 ? 'text-red-600' : 'text-green-600';
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-2">
      <div className="flex justify-between items-start mb-2">
        <span className="text-2xl font-bold">#{pedido.id.slice(0, 8)}</span>
        <span className={`${colorSLA} font-bold`}>{tiempoTranscurrido} min</span>
      </div>
      
      <div className="text-sm mb-2">
        <p><strong>Cliente:</strong> {pedido.cliente.nombre}</p>
        <p><strong>Tel:</strong> {pedido.cliente.telefono}</p>
        <p><strong>Dirección:</strong> {pedido.direccion_entrega}</p>
      </div>
      
      <div className="border-t pt-2 mb-2">
        {pedido.items.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{item.cantidad}x {item.menu_item.nombre}</span>
            <span className="font-mono">${item.subtotal}</span>
          </div>
        ))}
      </div>
      
      {pedido.notas && (
        <div className="bg-yellow-50 p-2 rounded text-sm mb-2">
          📝 {pedido.notas}
        </div>
      )}
      
      <div className="flex gap-2">
        {pedido.estado === 'pendiente' && (
          <button
            onClick={() => onCambiar(pedido.id, 'en_preparacion')}
            className="flex-1 bg-blue-500 text-white rounded py-2"
          >
            Iniciar
          </button>
        )}
        {pedido.estado === 'en_preparacion' && (
          <button
            onClick={() => onCambiar(pedido.id, 'listo')}
            className="flex-1 bg-green-500 text-white rounded py-2"
          >
            Listo
          </button>
        )}
      </div>
    </div>
  );
}
```

### 📋 Tareas Módulo 5 (3 horas)

#### Tarea 5.1: Componente Comandas (1.5 horas)
- [ ] Implementar `Comandas.tsx`
- [ ] Realtime subscriptions
- [ ] Drag & drop entre columnas (opcional)

#### Tarea 5.2: Notificaciones Sonoras (30 min)
```typescript
// frontend/src/lib/soundSystem.ts
export function playNewOrderSound() {
  const audio = new Audio('/sounds/new-order.mp3');
  audio.play();
}
```

#### Tarea 5.3: PWA Manifest (30 min)
```json
// frontend/public/manifest.json
{
  "name": "SIST Pizza - Cocina",
  "short_name": "Cocina",
  "start_url": "/comandas",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f97316",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

#### Tarea 5.4: Deploy Frontend (30 min)
```bash
cd frontend
npm run build
# Deploy a Vercel/Netlify/Cloudflare Pages
```

### ✅ Criterios de Aceptación Módulo 5
- [ ] Comandas se muestran en tiempo real
- [ ] Cambios de estado persisten
- [ ] Notificación sonora al nuevo pedido
- [ ] PWA instalable en tablet
- [ ] Deploy en producción

---

## 📦 MÓDULO 6: ADMIN & OBSERVABILITY

### 🎯 Objetivo
Dashboard administrativo y métricas

### 🛠️ Opciones

#### Opción A: Retool (Recomendado - No Code)
- **Pros:** Sin código, conecta directo a Supabase
- **Cons:** $10/mes por usuario

#### Opción B: Refine.dev (Open Source)
- **Pros:** Gratis, React-based
- **Cons:** Requiere desarrollo

### 📋 Tareas Módulo 6 (2 horas)

#### Tarea 6.1: Setup Retool (1 hora)
1. Crear cuenta retool.com
2. Conectar Supabase
3. Crear tabla de pedidos
4. Crear formulario de edición
5. Dashboard de KPIs

#### Tarea 6.2: Prometheus + Grafana (ya está) (30 min)
- [ ] Verificar `docker-compose.yml` tiene servicios
- [ ] Levantar: `docker-compose up prometheus grafana -d`
- [ ] Acceder: http://localhost:3001

#### Tarea 6.3: Dashboards Grafana (30 min)
- [ ] Importar dashboard pre-configurado
- [ ] Configurar alertas (pedidos > 30 min)

### ✅ Criterios de Aceptación Módulo 6
- [ ] Admin panel funcional
- [ ] Métricas en Grafana
- [ ] Alertas configuradas

---

## 🚀 PLAN DE EJECUCIÓN (15-20 horas)

### Semana 1: Fundamentos (10 horas)
**Día 1-2 (6h):** Módulos 1 + 2 (Canales + Backend)
**Día 3 (2h):** Módulo 3 (Supabase)
**Día 4 (2h):** Módulo 4 (Integraciones mock)

### Semana 2: Frontend + Admin (6 horas)
**Día 5 (3h):** Módulo 5 (PWA Cocina)
**Día 6 (2h):** Módulo 6 (Admin + Monitoring)
**Día 7 (1h):** Testing E2E + Docs

### Semana 3: Refinamiento (4 horas)
**Día 8-9:** Ajustes UX, bugs, performance
**Día 10:** Deploy producción + Demo

---

## ✅ CHECKLIST GENERAL

### Infraestructura
- [ ] Supabase proyecto creado
- [ ] N8N instalado (Docker)
- [ ] Chatwoot configurado
- [ ] WAHA conectado a WhatsApp

### Backend
- [ ] Código compilando sin errores
- [ ] Tests pasando
- [ ] Webhook N8N implementado
- [ ] Health check funcional

### Frontend
- [ ] PWA Cocina funcionando
- [ ] Realtime subscriptions activas
- [ ] Deploy en producción

### Integraciones
- [ ] MODO pagos (o mock)
- [ ] PrintNode (o mock)
- [ ] AFIP validation

### Observability
- [ ] Prometheus recolectando métricas
- [ ] Grafana dashboards configurados
- [ ] Admin panel funcional

### Documentación
- [ ] README actualizado
- [ ] API docs completa
- [ ] Video demo grabado

---

## 📊 MÉTRICAS DE ÉXITO

| Métrica | Objetivo | Estado |
|---------|----------|--------|
| **Tiempo Implementación** | < 20 horas | ⏳ |
| **Coverage Tests** | > 70% | ✅ 100% (48 tests) |
| **Uptime** | > 99% | ⏳ |
| **Latencia API** | < 200ms | ⏳ |
| **Pedidos por Hora** | > 20 | ⏳ |
| **SLA Entregas** | < 40 min | ⏳ |

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

**Responde con:**

1. **"MÓDULO 1"** → Empezamos con Canales (WAHA + Chatwoot + N8N)
2. **"MÓDULO 2"** → Arreglamos Backend primero
3. **"MÓDULO 3"** → Configuramos Supabase
4. **"AUTO"** → Ejecuto todos los módulos en secuencia

**¿Por dónde empezamos? 🚀**
