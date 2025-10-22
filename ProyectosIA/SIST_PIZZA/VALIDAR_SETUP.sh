#!/bin/bash

# VALIDACIÓN - Después de ejecutar SQL en Supabase

echo "🔍 VALIDANDO SETUP DE SIST_PIZZA..."
echo ""

# 1. Verificar backend está corriendo
echo "1. Verificar backend en puerto 4000..."
if curl -s http://localhost:4000/health | jq . > /dev/null 2>&1; then
  echo "   ✅ Backend respondiendo en http://localhost:4000"
else
  echo "   ❌ Backend NO está respondiendo"
  echo "   💡 Asegúrate que npm run dev esté ejecutándose"
  exit 1
fi
echo ""

# 2. Verificar health check
echo "2. Verificar health check..."
HEALTH=$(curl -s http://localhost:4000/api/health | jq -r '.database')
if [ "$HEALTH" == "ok" ]; then
  echo "   ✅ Database conectada correctamente"
else
  echo "   ❌ Database no está conectada"
  echo "   💡 Verifica que ejecutaste SQL en Supabase"
  exit 1
fi
echo ""

# 3. Verificar health/ready
echo "3. Verificar health/ready endpoint..."
READY=$(curl -s http://localhost:4000/api/health/ready | jq -r '.ready')
if [ "$READY" == "true" ]; then
  echo "   ✅ Sistema listo (ready)"
else
  echo "   ❌ Sistema NO está listo"
  exit 1
fi
echo ""

# 4. Resumen
echo "================================================================================"
echo "VALIDACION COMPLETADA - OK"
echo "================================================================================"
echo ""
echo "✓ Backend: CORRIENDO"
echo "✓ Database: CONECTADA"
echo "✓ Sistema: LISTO"
echo ""
echo "Sistema SIST_PIZZA listo para webhook!"
echo "================================================================================"
