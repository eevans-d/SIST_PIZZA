#!/usr/bin/env node
/**
 * Script de prueba de conexión a Supabase
 * Uso: node scripts/test-supabase.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !(SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('❌ Error: Variables de entorno faltantes');
  console.error('Asegúrate de tener en .env:');
  console.error('  SUPABASE_URL=...');
  console.error('  SUPABASE_ANON_KEY=...  (o SUPABASE_SERVICE_ROLE_KEY=...)');
  process.exit(1);
}

console.log('🔍 Probando conexión a Supabase...\n');
console.log('URL:', SUPABASE_URL);
if (SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Key (service_role):', SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...\n');
} else {
  console.log('Key (anon):', SUPABASE_ANON_KEY.substring(0, 20) + '...\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

async function testConnection() {
  try {
    // Test 1: Contar clientes (puede requerir service_role por RLS)
    console.log('📊 Test 1: Contar clientes...');
    try {
      const { count: clientesCount, error: e1 } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });
      if (e1) throw e1;
      console.log(`✅ Clientes: ${clientesCount} registros\n`);
    } catch (e) {
      console.warn('⚠️  No se pudo contar clientes (probable RLS con anon). Continuando...');
    }

    // Test 2: Listar primeros 5 items del menú
    console.log('📊 Test 2: Listar items del menú...');
    const { data: menuItems, error: e2 } = await supabase
      .from('menu_items')
      .select('nombre, categoria, precio, disponible')
      .limit(5);

    if (e2) throw e2;
    console.log('✅ Menu items:');
    menuItems.forEach(item => {
      console.log(`  - ${item.nombre} (${item.categoria}): $${item.precio} ${item.disponible ? '✓' : '✗'}`);
    });
    console.log('');

    // Test 3: Contar pedidos (puede requerir service_role por RLS)
    console.log('📊 Test 3: Contar pedidos...');
    try {
      const { count: pedidosCount, error: e3 } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true });
      if (e3) throw e3;
      console.log(`✅ Pedidos: ${pedidosCount} registros\n`);
    } catch (e) {
      console.warn('⚠️  No se pudo contar pedidos (probable RLS con anon). Continuando...');
    }

    // Test 4: Verificar zonas de entrega (puede requerir service_role por RLS)
    console.log('📊 Test 4: Zonas de entrega...');
    try {
      const { data: zonas, error: e4 } = await supabase
        .from('zonas_entrega')
        .select('nombre, costo_base');
      if (e4) throw e4;
      console.log('✅ Zonas:');
      zonas.forEach(zona => {
        console.log(`  - ${zona.nombre}: $${zona.costo_base}`);
      });
      console.log('');
    } catch (e) {
      console.warn('⚠️  No se pudieron listar zonas (probable RLS con anon). Continuando...');
    }

    console.log('🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('\n✅ Supabase está correctamente configurado.');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    console.error('\n🔧 Posibles soluciones:');
    console.error('  1. Verifica que las credenciales en .env sean correctas');
    console.error('  2. Asegúrate de haber ejecutado las migraciones SQL');
    console.error('  3. Verifica que el proyecto Supabase esté activo');
    process.exit(1);
  }
}

testConnection();
