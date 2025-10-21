# 📋 FASE 3: Frontend PWA (Prompts 15-25)
**Estimado**: 3-4 horas | **Inicio**: Oct 21, 2025  
**Objetivo**: Implementar React PWA con dashboard de comandas en tiempo real

---

## ✅ Checklist de Implementación

### Paso 1: Setup Proyecto React + Vite (Prompt 16)
- [ ] `frontend/vite.config.ts` - Configuración Vite
- [ ] `frontend/package.json` - Dependencias
- [ ] `frontend/tsconfig.json` - TypeScript config
- [ ] `frontend/public/manifest.json` - PWA manifest
- [ ] `frontend/src/main.tsx` - Entry point

### Paso 2: Stores y Context (Zustand)
- [ ] `frontend/src/store/comandas.ts` - Estado global comandas
- [ ] `frontend/src/store/ui.ts` - Estado UI

### Paso 3: Componentes Base (Prompts 17-22)
- [ ] `ComandaCard.tsx` - Card con colores por tiempo (Prompt 17)
- [ ] `ColumnaComandas.tsx` - Columna de estado (Prompt 18)
- [ ] `Comandas.tsx` - Vista principal (Prompt 19)
- [ ] `Header.tsx` - Indicadores conexión (Prompt 21)
- [ ] `ConfigModal.tsx` - Configuración + sonidos (Prompt 22)

### Paso 4: Hooks Custom (Prompt 20)
- [ ] `useRealtimeComandas.ts` - Suscripción Supabase
- [ ] `useNotifications.ts` - Sistema de notificaciones

### Paso 5: Sistema de Alertas (Prompts 23-24)
- [ ] `soundSystem.ts` - Audio alerts (Prompt 23)
- [ ] `timeUtils.ts` - Validaciones horario (Prompt 24)

### Paso 6: PWA Setup (Prompt 16)
- [ ] Service Worker
- [ ] Offline support
- [ ] Cache strategies

### Paso 7: Compilación
- [ ] npm run build sin errores
- [ ] Verificar PWA checklist

---

## 📚 Dependencias Requeridas

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "zustand": "^4.4.1",
  "@supabase/supabase-js": "^2.39.0",
  "@supabase/realtime-js": "^2.8.0",
  "vite": "^5.0.0",
  "typescript": "^5.2.0",
  "tailwindcss": "^3.3.0",
  "vite-plugin-pwa": "^0.16.4"
}
```

---

## 🎨 Estructura Frontend

```
frontend/src/
├── components/
│   ├── ComandaCard.tsx           # Card individual (Prompt 17)
│   ├── ColumnaComandas.tsx       # Columna por estado (Prompt 18)
│   ├── Header.tsx                 # Header + indicadores (Prompt 21)
│   └── ConfigModal.tsx            # Modal config (Prompt 22)
├── pages/
│   └── Comandas.tsx              # Dashboard (Prompt 19)
├── hooks/
│   ├── useRealtimeComandas.ts    # Realtime Supabase (Prompt 20)
│   └── useNotifications.ts        # Sistema notificaciones
├── store/
│   ├── comandas.ts                # Zustand: comandas
│   └── ui.ts                      # Zustand: UI
├── lib/
│   ├── soundSystem.ts             # Audio alerts (Prompt 23)
│   └── timeUtils.ts               # Time helpers (Prompt 24)
├── main.tsx                       # Entry point
└── App.tsx                        # Root component
```

---

## 🔒 Consideraciones de Seguridad

1. **Sin PII en Frontend**: Solo datos redactados de clientes
2. **Auth: Read-only**: Anon key para lectura de menú
3. **RLS Policies**: Backend solo (service_role)
4. **Offline**: Cache local, sync cuando vuelve
5. **PWA**: Installable, funciona sin internet

---

## 📊 Estados de Comanda

```
Nueva → Preparando → Lista → Entregada
   ↓
 Cancelada (en cualquier momento)

Colores:
- Nueva: 🔵 Azul (0-5 min)
- Preparando: 🟡 Amarillo (5-15 min)
- Lista: 🟢 Verde (>15 min)
```

---

## 🚀 Próxima Fase

**Fase 4**: Integración + DevOps (Prompts 26-40)
- Docker + docker-compose
- GitHub Actions CI/CD
- Monitoring y logging
- Deployment a producción
