# Integración de cambios desde GENSPARK

Esta guía explica cómo traer al repositorio SIST_PIZZA el trabajo realizado en la plataforma GENSPARK (o cualquier fuente externa).

Incluye dos scripts:
- `scripts/genspark_diff.sh` → Vista previa (dry-run) de lo que se importaría
- `scripts/genspark_sync.sh` → Sincroniza realmente y crea un commit

## Requisitos

- bash, git, unzip
- (opcional) `yq` para leer `.genspark-import.yml`

## Configuración de mapeo y exclusiones

Ajusta `.genspark-import.yml` para mapear carpetas y excluir archivos (node_modules, dist, .env, etc.). Si no defines mapeos, se preserva la estructura de la fuente en la raíz del repo.

## 3 formas de integrar

1) Desde un repositorio Git (recomendado)

Vista previa:

```bash
scripts/genspark_diff.sh --from-url https://github.com/usuario/proyecto-genspark.git --branch main
```

Aplicar cambios (con commit automático):

```bash
scripts/genspark_sync.sh --from-url https://github.com/usuario/proyecto-genspark.git --branch main
```

2) Desde un ZIP exportado

```bash
# Vista previa (no escribe)
scripts/genspark_diff.sh --from-zip /ruta/export.zip

# Aplicar cambios
scripts/genspark_sync.sh --from-zip /ruta/export.zip
```

3) Desde un directorio local

```bash
# Vista previa
scripts/genspark_diff.sh --from-dir /ruta/proyecto-genspark

# Aplicar
scripts/genspark_sync.sh --from-dir /ruta/proyecto-genspark
```

## Opciones útiles

- `--map .genspark-import.yml` → especificar un archivo de mapeo alternativo
- `--dry-run` → en `genspark_sync.sh` muestra lo que cambiaría sin escribir
- `--run-tests` → ejecuta `npm test` en `backend/` tras sincronizar

## Flujos recomendados

- PRD rápido: diff → sync → tests → push

```bash
scripts/genspark_diff.sh --from-url <url> --branch main
scripts/genspark_sync.sh --from-url <url> --branch main --run-tests
git push
```

- ZIP de GENSPARK:

```bash
scripts/genspark_diff.sh --from-zip ~/Downloads/genspark_export.zip
scripts/genspark_sync.sh --from-zip ~/Downloads/genspark_export.zip --run-tests
```

## Notas

- Por defecto no se tocan `.env` ni artefactos pesados.
- El commit generado incluye origen y fecha.
- Si hay conflictos lógicos, revisa el diff y ajusta `.genspark-import.yml` (mapeos) para controlar el destino de cada carpeta.

## Troubleshooting

- `yq: command not found` → instala yq o ignora (se usarán defaults).
- `fatal: repository access` → revisa URL y permisos.
- `unzip: not found` → instala `unzip` si importas desde ZIP.
- No se ven cambios → revisa exclusiones en `.genspark-import.yml`.
