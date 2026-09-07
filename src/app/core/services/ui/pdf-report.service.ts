import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Order,
  ORDER_STATUS_LABELS,
  OrderStatus,
} from '../../interfaces/order.interface';

/**
 * Servicio transversal para la generación de reportes profesionales en formato PDF.
 * Diseñado para ser utilizado en múltiples ecosistemas: Órdenes, Usuarios,
 * Inventario, Ventas y Auditoría.
 */
@Injectable({
  providedIn: 'root',
})
export class PdfReportService {
  constructor() {}

  /**
   * Formatea un valor numérico a moneda peruana (S/ 0.00)
   */
  private formatMoney(val: number | undefined | null): string {
    const num = Number(val) || 0;
    return `S/ ${num.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Normaliza la extracción de datos del cliente
   */
  private getClientData(order: Order): {
    name: string;
    email: string;
    dni: string;
    phone: string;
  } {
    const userObj =
      (order as any).user && typeof (order as any).user === 'object'
        ? (order as any).user
        : order.userId && typeof order.userId === 'object'
        ? (order.userId as any)
        : null;

    const name =
      userObj?.displayName ||
      userObj?.name ||
      order.shippingAddress?.alias ||
      'Cliente Moorea';
    const email = userObj?.email || 'Sin correo registrado';
    const dni =
      userObj?.dni || userObj?.documentNumber || 'No especificado';
    const phone =
      userObj?.phone || order.pickupStore?.phone || 'No especificado';

    return { name, email, dni, phone };
  }

  /**
   * Obtiene la etiqueta del método de pago
   */
  private getPaymentLabel(method?: string): string {
    switch (method) {
      case 'card':
        return 'Tarjeta (Izipay / Visa / Mastercard)';
      case 'yape':
        return 'Billetera Digital Yape';
      case 'cash':
        return 'Pago contra entrega / Efectivo';
      default:
        return 'No especificado';
    }
  }

  /**
   * Extrae el color formateado de la variante
   */
  private extractColor(color: any): string {
    if (!color) return '-';
    if (typeof color === 'string') return color;
    return color.colorName || color.name || color.code || '-';
  }

  /**
   * Extrae la talla formateada de la variante
   */
  private extractSize(size: any): string {
    if (!size) return '-';
    if (typeof size === 'string') return size;
    return size.size || size.value || '-';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. REPORTE CORPORATIVO DE ORDEN / HOJA DE PICKING Y DESPACHO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Genera y descarga el documento formal en PDF para una orden individual.
   * Incluye cabecera corporativa, datos del cliente, logística, tabla de picking,
   * desglose financiero y recuadros de firma para almacén y recepción.
   */
  generateOrderReport(order: Order, action: 'save' | 'open' = 'save'): void {
    if (!order) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const client = this.getClientData(order);
    const isPickup =
      order.fulfillment === 'pickup' || order.fulfillmentType === 'pickup';

    // ─── 1. Franja Superior y Cabecera Corporativa ───────────────────────────
    doc.setFillColor(76, 29, 149); // Púrpura corporativo Moorea (#4C1D95)
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Título Principal de la Marca
    doc.setTextColor(17, 24, 39); // Gray 900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MOOREA', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // Gray 500
    doc.text('E-COMMERCE & LOGÍSTICA · HOJA DE PREPARACIÓN Y DESPACHO', 14, 23);

    // Caja Superior Derecha: Número de Comprobante y Estado
    doc.setFillColor(249, 250, 251); // Gray 50
    doc.setDrawColor(229, 231, 235); // Gray 200
    doc.roundedRect(pageWidth - 75, 10, 61, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(76, 29, 149);
    doc.text(order.invoiceNumber || 'ORD-SIN-NUM', pageWidth - 70, 16);

    const statusLabel =
      ORDER_STATUS_LABELS[order.status as OrderStatus] ||
      (order.status || '').toUpperCase();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text(`Estado: ${statusLabel}`, pageWidth - 70, 21);

    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleDateString('es-PE');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(`Fecha: ${formattedDate}`, pageWidth - 70, 26);

    // ─── 2. Cajas de Información (Cliente vs. Logística) ────────────────────
    const startY = 35;
    const boxWidth = (pageWidth - 28 - 4) / 2; // 2 columnas iguales

    // COLUMNA A: Datos del Cliente
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(14, startY, boxWidth, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(76, 29, 149);
    doc.text('DATOS DEL CLIENTE', 18, startY + 6);

    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre:', 18, startY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(client.name, 34, startY + 12);

    doc.setFont('helvetica', 'bold');
    doc.text('DNI / Doc:', 18, startY + 17);
    doc.setFont('helvetica', 'normal');
    doc.text(client.dni, 34, startY + 17);

    doc.setFont('helvetica', 'bold');
    doc.text('Email:', 18, startY + 22);
    doc.setFont('helvetica', 'normal');
    doc.text(client.email, 34, startY + 22);

    doc.setFont('helvetica', 'bold');
    doc.text('Teléfono:', 18, startY + 27);
    doc.setFont('helvetica', 'normal');
    doc.text(client.phone, 34, startY + 27);

    // COLUMNA B: Modalidad de Entrega y Destino
    const col2X = 14 + boxWidth + 4;
    doc.roundedRect(col2X, startY, boxWidth, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(76, 29, 149);
    doc.text('MODALIDAD Y DESTINO', col2X + 4, startY + 6);

    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.text('Modalidad:', col2X + 4, startY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(isPickup ? 'Retiro en Tienda Física' : 'Envío a Domicilio', col2X + 22, startY + 12);

    if (isPickup) {
      doc.setFont('helvetica', 'bold');
      doc.text('Sucursal:', col2X + 4, startY + 17);
      doc.setFont('helvetica', 'normal');
      const storeName = order.pickupStore?.name || 'Tienda Principal';
      doc.text(storeName, col2X + 22, startY + 17);

      doc.setFont('helvetica', 'bold');
      doc.text('Dirección:', col2X + 4, startY + 22);
      doc.setFont('helvetica', 'normal');
      const storeAddr = order.pickupStore?.address || 'Lima, Perú';
      const truncatedAddr = storeAddr.length > 40 ? storeAddr.substring(0, 38) + '...' : storeAddr;
      doc.text(truncatedAddr, col2X + 22, startY + 22);

      if (order.pickupCode) {
        doc.setFont('helvetica', 'bold');
        doc.text('Código Retiro:', col2X + 4, startY + 27);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(147, 51, 234); // Púrpura vibrante
        doc.text(order.pickupCode, col2X + 25, startY + 27);
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text('Dirección:', col2X + 4, startY + 17);
      doc.setFont('helvetica', 'normal');
      const addr = `${order.shippingAddress?.street || ''} ${order.shippingAddress?.streetNumber || ''}, ${order.shippingAddress?.district || ''}`;
      doc.text(addr.substring(0, 42), col2X + 22, startY + 17);

      doc.setFont('helvetica', 'bold');
      doc.text('Ciudad/Dpto:', col2X + 4, startY + 22);
      doc.setFont('helvetica', 'normal');
      doc.text(`${order.shippingAddress?.province || 'Lima'}, ${order.shippingAddress?.department || 'Lima'}`, col2X + 22, startY + 22);

      if (order.shippingAddress?.references) {
        doc.setFont('helvetica', 'bold');
        doc.text('Referencia:', col2X + 4, startY + 27);
        doc.setFont('helvetica', 'normal');
        doc.text(order.shippingAddress.references.substring(0, 38), col2X + 22, startY + 27);
      }
    }

    // Método de pago compartido abajo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Método de Pago: ${this.getPaymentLabel(order.paymentMethod)} · Estado: PAGADO`, 14, startY + 40);

    // ─── 3. Tabla de Productos (Picking List) con jspdf-autotable ─────────────
    const tableBody = (order.items || []).map((item, idx) => [
      idx + 1,
      `${item.productName}\nSKU: ${item.sku || '-'}`,
      `${this.extractColor(item.color)} / ${this.extractSize(item.size)}`,
      item.quantity,
      this.formatMoney(item.unitPrice),
      item.discount > 0 ? `-${item.discount}%` : '-',
      this.formatMoney(item.subtotal),
      '[  ]', // Casilla de verificación manual para almacén
    ]);

    autoTable(doc, {
      startY: startY + 44,
      head: [
        [
          '#',
          'PRODUCTO / DESCRIPCIÓN',
          'COLOR / TALLA',
          'CANT.',
          'P. UNIT.',
          'DESC.',
          'SUBTOTAL',
          'CHECK',
        ],
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [76, 29, 149],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 32 },
        3: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 16 },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
        7: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        valign: 'middle',
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: { left: 14, right: 14 },
    });

    // ─── 4. Totales Financieros ──────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 4;
    const totalsBoxWidth = 75;
    const totalsBoxX = pageWidth - 14 - totalsBoxWidth;

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(totalsBoxX, finalY, totalsBoxWidth, 28, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);

    doc.text('Subtotal:', totalsBoxX + 4, finalY + 6);
    doc.text(this.formatMoney(order.pricing?.subtotalBeforeDiscount), pageWidth - 18, finalY + 6, { align: 'right' });

    doc.text('Descuento:', totalsBoxX + 4, finalY + 11);
    const discountStr = order.pricing?.discount ? `-${this.formatMoney(order.pricing.discount)}` : 'S/ 0.00';
    doc.text(discountStr, pageWidth - 18, finalY + 11, { align: 'right' });

    doc.text('Costo de Envío:', totalsBoxX + 4, finalY + 16);
    const shippingStr = order.pricing?.shippingCost ? this.formatMoney(order.pricing.shippingCost) : 'S/ 0.00';
    doc.text(shippingStr, pageWidth - 18, finalY + 16, { align: 'right' });

    doc.setDrawColor(209, 213, 219);
    doc.line(totalsBoxX + 4, finalY + 19, pageWidth - 18, finalY + 19);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(76, 29, 149);
    doc.text('TOTAL GENERAL:', totalsBoxX + 4, finalY + 25);
    doc.text(this.formatMoney(order.pricing?.total), pageWidth - 18, finalY + 25, { align: 'right' });

    // ─── 5. Recuadros de Firma y Conformidad ─────────────────────────────────
    const signY = Math.max(finalY + 34, 235);
    const signBoxWidth = (pageWidth - 28 - 10) / 2;

    // Caja 1: Almacén / Preparador
    doc.setDrawColor(209, 213, 219);
    doc.roundedRect(14, signY, signBoxWidth, 24, 2, 2);
    doc.line(18, signY + 16, 14 + signBoxWidth - 4, signY + 16);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text('PREPARADO Y REVISADO POR (ALMACÉN)', 14 + signBoxWidth / 2, signY + 20, { align: 'center' });

    // Caja 2: Recibido Conforme (Cliente o Transportista)
    const sign2X = 14 + signBoxWidth + 10;
    doc.roundedRect(sign2X, signY, signBoxWidth, 24, 2, 2);
    doc.line(sign2X + 4, signY + 16, sign2X + signBoxWidth - 4, signY + 16);
    doc.text('RECIBIDO CONFORME (CLIENTE / COURIER)', sign2X + signBoxWidth / 2, signY + 20, { align: 'center' });

    // ─── 6. Pie de Página Institucional ──────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(
        'Moorea E-Commerce · Documento interno de control logístico y entrega de mercancía.',
        14,
        290
      );
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, 290, {
        align: 'right',
      });
    }

    // Descargar archivo o abrir
    const filename = `Reporte-Orden-${order.invoiceNumber || order._id}.pdf`;
    if (action === 'save') {
      doc.save(filename);
    } else {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. REPORTE GENERAL DE USUARIOS (Listo para el módulo de usuarios)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Genera reporte estructurado de usuarios/clientes
   */
  generateUsersReport(users: any[], title: string = 'Reporte General de Usuarios'): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabecera
    doc.setFillColor(76, 29, 149);
    doc.rect(0, 0, pageWidth, 5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.text('MOOREA BOUTIQUE', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(title.toUpperCase(), 14, 21);

    const body = (users || []).map((u, i) => [
      i + 1,
      u.displayName || u.name || '-',
      u.email || '-',
      u.dni || u.documentNumber || '-',
      u.phone || '-',
      Array.isArray(u.roles) ? u.roles.join(', ') : u.role || 'customer',
      u.isActive !== false ? 'Activo' : 'Inactivo',
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['#', 'NOMBRE', 'EMAIL', 'DNI', 'TELÉFONO', 'ROL', 'ESTADO']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [76, 29, 149], fontSize: 8, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, 290, { align: 'right' });
    }

    doc.save(`Reporte-Usuarios-${Date.now()}.pdf`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. REPORTE GENÉRICO EN TABLA (Para cualquier otro módulo de Moorea)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generador genérico de reportes en tabla exportable a PDF
   */
  generateGenericTableReport(
    title: string,
    subtitle: string,
    headers: string[],
    rows: any[][],
    filenamePrefix: string = 'Reporte'
  ): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(76, 29, 149);
    doc.rect(0, 0, pageWidth, 5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.text('MOOREA BOUTIQUE', 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(76, 29, 149);
    doc.text(title.toUpperCase(), 14, 22);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(subtitle, 14, 26);

    autoTable(doc, {
      startY: 31,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [76, 29, 149], fontSize: 8, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, 290, { align: 'right' });
    }

    doc.save(`${filenamePrefix}-${Date.now()}.pdf`);
  }
}
