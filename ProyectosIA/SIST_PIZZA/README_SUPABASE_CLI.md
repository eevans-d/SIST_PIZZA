# Supabase CLI — Guía de Instalación y Uso Seguro

Esta guía te permite instalar, configurar y operar la CLI de Supabase en este repo de forma segura y reproducible.

## 1) Instalación

Recomendado (Linux):

```bash
bash scripts/install_supabase_cli.sh
```

El script intentará:
- Instalador oficial (`cli.supabase.com`)
- Fallback a GitHub Releases
- Añadir `~/.supabase/bin` al PATH

Si tu entorno no tiene internet o DNS (CI restringido), verás instrucciones de instalación manual.

Verifica la versión:

```bash
supabase --version
```

> Tip: si la terminal actual no recargó variables, exporta temporalmente:
>
> ```bash
> export PATH="$HOME/.supabase/bin:$PATH"
> ```

## 2) Variables requeridas

Copia `.env.example` a `.env` y completa:

```env
SUPABASE_ACCESS_TOKEN= # Token personal para `supabase login`
SUPABASE_PROJECT_REF=  # Referencia de proyecto, ej: abcd1234
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DATABASE_URL=
```

Nunca commitees `.env` con secretos. Usa Secrets del repositorio/Actions para CI.

## 3) Setup (login + link)

```bash
# Carga tus variables locales (si usas .env)
export $(grep -v '^#' .env | xargs) || true

# Ejecuta el setup (usa SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF)
bash scripts/supabase_cli_setup.sh
```

Esto realizará:
- `supabase login` (token leído por stdin)
- `supabase link --project-ref <ref>`
- `supabase status`

## 4) Comandos de base de datos (wrapper)

Atajos seguros:

```bash
bash scripts/supabase_db_commands.sh status
bash scripts/supabase_db_commands.sh dump-schema
bash scripts/supabase_db_commands.sh push
```

- `dump-schema`: crea `supabase/dumps/schema_YYYYMMDD_HHMMSS.sql`
- `push`: aplica migraciones locales al remoto linkeado (revisa primero `supabase/migrations/`)

## 5) Flujos comunes

- Volcar esquema remoto a archivo:
  ```bash
  supabase db dump --schema-only --if-exists --data-only=false --file supabase/dumps/schema.sql
  ```

- Aplicar migraciones al remoto (cautela):
  ```bash
  supabase db push
  ```

- Generar tipos (si tu versión lo soporta):
  ```bash
  supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" --schema public > supabase/types.ts
  ```

## 6) Troubleshooting

- DNS/Internet bloqueado:
  - Usa la instalación manual (ver salida del script)
  - Configura proxy corporativo si aplica

- `supabase` no se encuentra:
  - Añade al PATH: `export PATH="$HOME/.supabase/bin:$PATH"`
  - Verifica permisos ejecutables: `chmod +x ~/.supabase/bin/supabase`

- Fallo en `login`:
  - Revisa expiración del token y permisos
  - Evita pegar el token en historial; el script lo lee por stdin

- Fallo en `link`:
  - Verifica el `SUPABASE_PROJECT_REF` en el dashboard de Supabase

## 7) Seguridad

- No subas `.env` al repositorio
- Usa GitHub Actions Secrets para CI/CD
- Rota tokens cada 90 días (recomendado)

---

Listo. Con esto puedes operar la base, dumps, y despliegues de cambios de forma controlada.
