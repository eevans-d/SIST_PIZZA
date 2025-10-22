#!/bin/bash
# ==============================================================================
# Script de inicialización de bases de datos para Canales
# Crea DB separada para N8N (Chatwoot ya usa la DB principal)
# ==============================================================================

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    -- Crear base de datos para N8N
    SELECT 'CREATE DATABASE n8n'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

    -- Otorgar permisos
    GRANT ALL PRIVILEGES ON DATABASE n8n TO $POSTGRES_USER;

    -- Log de éxito
    \echo '✅ Base de datos N8N creada exitosamente'
EOSQL

echo "✅ Inicialización de DBs completada"
