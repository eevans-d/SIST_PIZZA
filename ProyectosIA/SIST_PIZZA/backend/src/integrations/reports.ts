/**
 * Generación de Reportes PDF/Excel (Prompt 26)
 * - Exportar pedidos filtrados
 * - PDF con pdfkit, Excel con exceljs
 * - Incluir totales y estadísticas
 * - Compresión automática
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../lib/logger';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

interface ReporteParams {
  fecha_inicio?: string; // YYYY-MM-DD
  fecha_fin?: string;
  estado?: string;
  zona?: string;
  formato: 'pdf' | 'excel';
}

/**
 * Generar reporte de pedidos
 */
export async function generarReporte(params: ReporteParams): Promise<Buffer> {
  try {
    // 1. Obtener datos
    let query = supabase
      .from('pedidos')
      .select(
        'id, numero:id, cliente_id, estado, total, created_at, clientes(nombre, zona)'
      );

    if (params.fecha_inicio) {
      query = query.gte('created_at', params.fecha_inicio);
    }

    if (params.fecha_fin) {
      query = query.lte('created_at', params.fecha_fin);
    }

    if (params.estado) {
      query = query.eq('estado', params.estado);
    }

    const { data: pedidos, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;

    logger.info('[REPORTS] Generando reporte', {
      formato: params.formato,
      registros: pedidos?.length || 0,
    });

    // 2. Calcular estadísticas
    const stats = calcularEstadisticas(pedidos || []);

    // 3. Generar documento
    if (params.formato === 'pdf') {
      return await generarPDF(pedidos || [], stats);
    } else {
      return await generarExcel(pedidos || [], stats);
    }
  } catch (error) {
    logger.error('[REPORTS] Error generando reporte', { error });
    throw error;
  }
}

/**
 * Generar PDF con pdfkit
 */
async function generarPDF(
  pedidos: any[],
  stats: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      bufferPages: true,
      margins: { top: 50, left: 50, right: 50, bottom: 50 },
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: any) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    // Header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('🍕 SIST_PIZZA - Reporte de Pedidos', { align: 'center' });

    doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-AR')}`, {
      align: 'center',
    });

    doc.moveDown();

    // Estadísticas
    doc.fontSize(12).font('Helvetica-Bold').text('Estadísticas');
    doc.fontSize(10).font('Helvetica');

    doc.text(`Total de pedidos: ${stats.total}`, { indent: 10 });
    doc.text(`Ingresos totales: $${stats.ingresos.toFixed(2)}`, { indent: 10 });
    doc.text(`Promedio por pedido: $${(stats.ingresos / stats.total).toFixed(2)}`, {
      indent: 10,
    });
    doc.text(`Por estado: ${JSON.stringify(stats.por_estado)}`, { indent: 10 });

    doc.moveDown();

    // Tabla de pedidos
    doc.fontSize(12).font('Helvetica-Bold').text('Detalle de Pedidos');
    doc.fontSize(9).font('Helvetica');

    // Headers tabla
    const tableTop = doc.y + 10;
    const col1 = 60;
    const col2 = 150;
    const col3 = 250;
    const col4 = 350;
    const col5 = 450;

    doc.text('ID', col1, tableTop);
    doc.text('Cliente', col2, tableTop);
    doc.text('Estado', col3, tableTop);
    doc.text('Total', col4, tableTop);
    doc.text('Fecha', col5, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;

    // Rows
    pedidos.slice(0, 50).forEach((pedido: any) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.text(pedido.id.substring(0, 8), col1, y);
      doc.text((pedido.clientes?.nombre || 'N/A').substring(0, 20), col2, y);
      doc.text(pedido.estado, col3, y);
      doc.text(`$${pedido.total.toFixed(2)}`, col4, y);
      doc.text(new Date(pedido.created_at).toLocaleDateString(), col5, y);

      y += 15;
    });

    if (pedidos.length > 50) {
      doc.text(`... y ${pedidos.length - 50} más pedidos`, 60, y + 15);
    }

    doc.end();
  });
}

/**
 * Generar Excel con exceljs
 */
async function generarExcel(
  pedidos: any[],
  stats: any
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Hoja 1: Resumen
  const sheetResumen = workbook.addWorksheet('Resumen');

  sheetResumen.columns = [
    { header: 'Métrica', key: 'metrica', width: 25 },
    { header: 'Valor', key: 'valor', width: 20 },
  ];

  sheetResumen.addRows([
    { metrica: 'Total de pedidos', valor: stats.total },
    { metrica: 'Ingresos totales', valor: `$${stats.ingresos.toFixed(2)}` },
    { metrica: 'Promedio por pedido', valor: `$${(stats.ingresos / stats.total).toFixed(2)}` },
    {
      metrica: 'Por estado',
      valor: Object.entries(stats.por_estado)
        .map(([estado, count]) => `${estado}: ${count}`)
        .join(', '),
    },
  ]);

  // Aplicar estilos
  sheetResumen.getRow(1).font = { bold: true };
  sheetResumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };

  // Hoja 2: Pedidos
  const sheetPedidos = workbook.addWorksheet('Pedidos');

  sheetPedidos.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'Cliente', key: 'cliente', width: 25 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Zona', key: 'zona', width: 12 },
    { header: 'Fecha', key: 'fecha', width: 20 },
  ];

  // Agregar datos
  pedidos.forEach((pedido: any) => {
    sheetPedidos.addRow({
      id: pedido.id.substring(0, 8),
      cliente: pedido.clientes?.nombre || 'N/A',
      estado: pedido.estado,
      total: `$${pedido.total.toFixed(2)}`,
      zona: pedido.clientes?.zona || 'N/A',
      fecha: new Date(pedido.created_at).toLocaleString('es-AR'),
    });
  });

  // Estilos
  sheetPedidos.getRow(1).font = { bold: true };
  sheetPedidos.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };

  // Generar buffer
  return await workbook.xlsx.writeBuffer() as any;
}

/**
 * Calcular estadísticas
 */
function calcularEstadisticas(pedidos: any[]): any {
  const total = pedidos.length;
  const ingresos = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
  const por_estado: Record<string, number> = {};

  pedidos.forEach((p) => {
    por_estado[p.estado] = (por_estado[p.estado] || 0) + 1;
  });

  return {
    total,
    ingresos,
    por_estado,
  };
}

/**
 * Endpoint para descargar reporte
 */
export async function handleReporteDownload(
  req: any,
  res: any
) {
  try {
    const { fecha_inicio, fecha_fin, estado, formato = 'pdf' } = req.query;

    const buffer = await generarReporte({
      fecha_inicio,
      fecha_fin,
      estado,
      formato,
    });

    const filename = `reporte-${new Date().toISOString().split('T')[0]}.${
      formato === 'pdf' ? 'pdf' : 'xlsx'
    }`;

    res.setHeader('Content-Type',
      formato === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    logger.error('[REPORTS] Error en descarga', { error });
    res.status(500).json({ error: 'Error generando reporte' });
  }
}
