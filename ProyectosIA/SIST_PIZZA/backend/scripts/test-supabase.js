#!/usr/bin/env node
/**
 * Script de prueba de conexión a Supabase
 * Uso: node scripts/test-supabase.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno faltantes');
  console.error('Asegúrate de tener en .env:');
  console.error('  SUPABASE_URL=...');
  console.error('  SUPABASE_ANON_KEY=...');
  process.exit(1);
}

console.log('🔍 Probando conexión a Supabase...\n');
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  try {
    // Test 1: Contar clientes
    console.log('📊 Test 1: Contar clientes...');
    const { count: clientesCount, error: e1 } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true });
    
    if (e1) throw e1;
    console.log(`✅ Clientes: ${clientesCount} registros\n`);

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

    // Test 3: Contar pedidos
    console.log('📊 Test 3: Contar pedidos...');
    const { count: pedidosCount, error: e3 } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true });
    
    if (e3) throw e3;
    console.log(`✅ Pedidos: ${pedidosCount} registros\n`);

    // Test 4: Verificar zonas de entrega
    console.log('📊 Test 4: Zonas de entrega...');
    const { data: zonas, error: e4 } = await supabase
      .from('zonas_entrega')
      .select('nombre, costo_envio');
    
    if (e4) throw e4;
    console.log('✅ Zonas:');
    zonas.forEach(zona => {
      console.log(`  - ${zona.nombre}: $${zona.costo_envio}`);
    });
    console.log('');

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
