import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';

import { ProductsService } from '../../../../core/services/catalog/products.service';
import { ProductVariantsService } from '../../../../core/services/catalog/product-variants.service';
import { ImageService } from '../../../../core/services/utils/image.service';
import { ToastService } from '../../../../core/services/ui/toast.service';
import { Product } from '../../../../core/interfaces/product.interface';

export interface MediaAsset {
  id: string;
  name: string;
  size: number;
  file?: File;
  previewUrl: string;
  remoteUrl?: string;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
}

export interface ParsedImageResolution {
  original: string;
  resolvedUrl?: string;
  isMissing: boolean;
}

export interface ColorVariantGroup {
  colorName: string;
  colorHex: string;
  colorCode: string;
  variants: any[];
  gallery: string[];
}

export interface ParsedBulkProduct {
  code: string;
  name: string;
  brand: string;
  model: string;
  description?: string;
  basePrice: number;
  discount?: number;
  category: string[];
  tags?: string[];
  gallery: string[];
  resolvedGallery: ParsedImageResolution[];
  specifications?: Record<string, string>;
  warranty?: any;
  variants?: any[];
  isValid: boolean;
  validationErrors: string[];
}

export interface BatchItemResult {
  code: string;
  name: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
  createdId?: string;
  variantsCreatedCount?: number;
}

const SAMPLE_BULK_JSON = `[
  {
    "code": "CALZ-SNK-APEX-01",
    "name": "Zapatilla Urbana Apex Street Luxe",
    "brand": "MOOREA FOOTWEAR",
    "model": "Apex Street",
    "description": "Zapatilla urbana contemporánea confeccionada en cuero vacuno y gamuza con suela vulcanizada.",
    "basePrice": 289.90,
    "discount": 15,
    "category": ["Calzado", "Zapatillas", "Hombre", "Moda Urbana"],
    "tags": ["sneakers", "luxe", "streetwear", "calzado"],
    "gallery": [],
    "specifications": {
      "Material Exterior": "Cuero vacuno genuino y paneles de gamuza",
      "Forro Interior": "Malla textil transpirable",
      "Suela": "Goma vulcanizada antideslizante con amortiguación"
    },
    "warranty": {
      "duration": 6,
      "unit": "months",
      "type": "manufacturer",
      "description": "Garantía de fábrica en suela, pegado y costuras"
    },
    "variants": [
      {
        "sku": "APEX-01-NEG-40",
        "color": { "name": "Negro Total", "hex": "#111827", "code": "NEG" },
        "size": { "type": "footwear", "value": "40", "region": "EU" },
        "gallery": []
      },
      {
        "sku": "APEX-01-NEG-41",
        "color": { "name": "Negro Total", "hex": "#111827", "code": "NEG" },
        "size": { "type": "footwear", "value": "41", "region": "EU" },
        "gallery": []
      },
      {
        "sku": "APEX-01-NEG-42",
        "color": { "name": "Negro Total", "hex": "#111827", "code": "NEG" },
        "size": { "type": "footwear", "value": "42", "region": "EU" },
        "gallery": []
      },
      {
        "sku": "APEX-01-BCO-40",
        "color": { "name": "Blanco Puro", "hex": "#FFFFFF", "code": "BCO" },
        "size": { "type": "footwear", "value": "40", "region": "EU" },
        "gallery": []
      },
      {
        "sku": "APEX-01-BCO-41",
        "color": { "name": "Blanco Puro", "hex": "#FFFFFF", "code": "BCO" },
        "size": { "type": "footwear", "value": "41", "region": "EU" },
        "gallery": []
      },
      {
        "sku": "APEX-01-BCO-42",
        "color": { "name": "Blanco Puro", "hex": "#FFFFFF", "code": "BCO" },
        "size": { "type": "footwear", "value": "42", "region": "EU" },
        "gallery": []
      },
      {
        "sku": "APEX-01-MIL-41",
        "color": { "name": "Verde Militar", "hex": "#2E4A35", "code": "MIL" },
        "size": { "type": "footwear", "value": "41", "region": "EU" },
        "gallery": []
      },
      {
        "sku": "APEX-01-MIL-42",
        "color": { "name": "Verde Militar", "hex": "#2E4A35", "code": "MIL" },
        "size": { "type": "footwear", "value": "42", "region": "EU" },
        "gallery": []
      },
      {
        "sku": "APEX-01-GRS-41",
        "color": { "name": "Gris Humo", "hex": "#6B7280", "code": "GRS" },
        "size": { "type": "footwear", "value": "41", "region": "EU" },
        "gallery": []
      },
      {
        "sku": "APEX-01-GRS-42",
        "color": { "name": "Gris Humo", "hex": "#6B7280", "code": "GRS" },
        "size": { "type": "footwear", "value": "42", "region": "EU" },
        "gallery": []
      }
    ]
  },
  {
    "code": "ROPA-HOOD-HEAVY-02",
    "name": "Hoodie Pesado Oversized Pima Fleece",
    "brand": "MOOREA APPAREL",
    "model": "Pima Heavy 450",
    "description": "Polera con capucha estilo oversized en algodón pima pesado de 450 gsm con interior perchado ultra suave.",
    "basePrice": 189.00,
    "discount": 10,
    "category": ["Ropa", "Poleras", "Unisex", "Invierno"],
    "tags": ["hoodie", "oversized", "algodón pima", "invierno"],
    "gallery": [],
    "specifications": {
      "Gramaje": "450 GSM Heavyweight",
      "Composición": "100% Algodón Pima Peruano Peinado",
      "Acabado": "Pre-lavado anti-encogimiento"
    },
    "warranty": {
      "duration": 3,
      "unit": "months",
      "type": "store",
      "description": "Garantía de tienda ante decoloración o defectos de confección"
    },
    "variants": [
      {
        "sku": "HOOD-02-CRB-S",
        "color": { "name": "Negro Carbón", "hex": "#18181B", "code": "CRB" },
        "size": { "type": "clothing", "value": "S" },
        "gallery": []
      },
      {
        "sku": "HOOD-02-CRB-M",
        "color": { "name": "Negro Carbón", "hex": "#18181B", "code": "CRB" },
        "size": { "type": "clothing", "value": "M" },
        "gallery": []
      },
      {
        "sku": "HOOD-02-CRB-L",
        "color": { "name": "Negro Carbón", "hex": "#18181B", "code": "CRB" },
        "size": { "type": "clothing", "value": "L" },
        "gallery": []
      },
      {
        "sku": "HOOD-02-BGE-S",
        "color": { "name": "Beige Arena", "hex": "#D4C5B9", "code": "BGE" },
        "size": { "type": "clothing", "value": "S" },
        "gallery": []
      },
      {
        "sku": "HOOD-02-BGE-M",
        "color": { "name": "Beige Arena", "hex": "#D4C5B9", "code": "BGE" },
        "size": { "type": "clothing", "value": "M" },
        "gallery": []
      },
      {
        "sku": "HOOD-02-BGE-L",
        "color": { "name": "Beige Arena", "hex": "#D4C5B9", "code": "BGE" },
        "size": { "type": "clothing", "value": "L" },
        "gallery": []
      },
      {
        "sku": "HOOD-02-AZP-M",
        "color": { "name": "Azul Petróleo", "hex": "#164E63", "code": "AZP" },
        "size": { "type": "clothing", "value": "M" },
        "gallery": []
      },
      {
        "sku": "HOOD-02-AZP-L",
        "color": { "name": "Azul Petróleo", "hex": "#164E63", "code": "AZP" },
        "size": { "type": "clothing", "value": "L" },
        "gallery": []
      },
      {
        "sku": "HOOD-02-BRG-M",
        "color": { "name": "Borgoña Profundo", "hex": "#4A1521", "code": "BRG" },
        "size": { "type": "clothing", "value": "M" },
        "gallery": []
      },
      {
        "sku": "HOOD-02-BRG-L",
        "color": { "name": "Borgoña Profundo", "hex": "#4A1521", "code": "BRG" },
        "size": { "type": "clothing", "value": "L" },
        "gallery": []
      }
    ]
  },
  {
    "code": "ACCE-BACKPACK-PRO-03",
    "name": "Mochila Modular Impermeable CityPack 25L",
    "brand": "MOOREA GEAR",
    "model": "CityPack Pro",
    "description": "Mochila técnica impermeable con compartimento acolchado para laptop de 16 pulgadas y apertura 180 grados.",
    "basePrice": 229.00,
    "discount": 0,
    "category": ["Accesorios", "Mochilas", "Viajes", "Tecnología"],
    "tags": ["mochila", "impermeable", "laptop", "ergonómica"],
    "gallery": [],
    "specifications": {
      "Capacidad": "25 Litros",
      "Compartimiento": "Laptop acolchado hasta 16 pulgadas",
      "Material": "Nylon Cordura Balístico 1000D",
      "Impermeabilidad": "Cremalleras YKK selladas IPX5"
    },
    "warranty": {
      "duration": 12,
      "unit": "months",
      "type": "manufacturer",
      "description": "Garantía de 1 año en costuras, herrajes y cremalleras"
    },
    "variants": [
      {
        "sku": "CPACK-03-NMT-20L",
        "color": { "name": "Negro Mate", "hex": "#09090B", "code": "NMT" },
        "size": { "type": "volume_l", "value": "20L" },
        "gallery": []
      },
      {
        "sku": "CPACK-03-NMT-25L",
        "color": { "name": "Negro Mate", "hex": "#09090B", "code": "NMT" },
        "size": { "type": "volume_l", "value": "25L" },
        "gallery": []
      },
      {
        "sku": "CPACK-03-NMT-30L",
        "color": { "name": "Negro Mate", "hex": "#09090B", "code": "NMT" },
        "size": { "type": "volume_l", "value": "30L" },
        "gallery": []
      },
      {
        "sku": "CPACK-03-GRA-20L",
        "color": { "name": "Gris Grafito", "hex": "#374151", "code": "GRA" },
        "size": { "type": "volume_l", "value": "20L" },
        "gallery": []
      },
      {
        "sku": "CPACK-03-GRA-25L",
        "color": { "name": "Gris Grafito", "hex": "#374151", "code": "GRA" },
        "size": { "type": "volume_l", "value": "25L" },
        "gallery": []
      },
      {
        "sku": "CPACK-03-GRA-30L",
        "color": { "name": "Gris Grafito", "hex": "#374151", "code": "GRA" },
        "size": { "type": "volume_l", "value": "30L" },
        "gallery": []
      },
      {
        "sku": "CPACK-03-OXF-25L",
        "color": { "name": "Azul Oxford", "hex": "#1E293B", "code": "OXF" },
        "size": { "type": "volume_l", "value": "25L" },
        "gallery": []
      },
      {
        "sku": "CPACK-03-OXF-30L",
        "color": { "name": "Azul Oxford", "hex": "#1E293B", "code": "OXF" },
        "size": { "type": "volume_l", "value": "30L" },
        "gallery": []
      },
      {
        "sku": "CPACK-03-OLV-25L",
        "color": { "name": "Verde Olivo", "hex": "#3F4E3A", "code": "OLV" },
        "size": { "type": "volume_l", "value": "25L" },
        "gallery": []
      },
      {
        "sku": "CPACK-03-OLV-30L",
        "color": { "name": "Verde Olivo", "hex": "#3F4E3A", "code": "OLV" },
        "size": { "type": "volume_l", "value": "30L" },
        "gallery": []
      }
    ]
  }
]`;

@Component({
  selector: 'app-bulk-product-creator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-product-creator.component.html',
  styleUrl: './bulk-product-creator.component.css',
})
export class BulkProductCreatorComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // ── Asset Pool de Medios ──────────────────────────────────────────────────
  mediaAssets: MediaAsset[] = [];
  isUploadingMedia = false;
  uploadProgressText = '';
  brokenImageRefs = new Set<string>();
  brokenAssetIds = new Set<string>();

  // ── Editor de Código JSON ─────────────────────────────────────────────────
  rawJson = '';
  jsonSyntaxError: string | null = null;
  parsedProducts: ParsedBulkProduct[] = [];

  // ── Filtros y Vistas (3 Pasos Clave) ───────────────────────────────────────
  activeSubTab: 'editor' | 'puzzle' | 'preview' = 'puzzle';

  // ── Tablero Interactivo (El Puzzle) ───────────────────────────────────────
  draggedAsset: MediaAsset | null = null;
  activeDropZoneId: string | null = null;
  selectedAssetIds = new Set<string>();
  puzzleFilter: 'unassigned' | 'all' = 'unassigned';
  selectedProductFilter: number | 'all' = 'all';

  // ── Modal de Selección Rápida Inversa ("Click-to-Pick") ───────────────────
  quickPickerTarget: {
    type: 'master' | 'color';
    productIndex: number;
    colorCode?: string;
    targetTitle: string;
    productCode: string;
  } | null = null;

  // ── Ejecución de Carga Masiva ─────────────────────────────────────────────
  isExecuting = false;
  currentProcessingIndex = 0;
  totalToProcess = 0;
  batchResults: BatchItemResult[] = [];
  isCompleted = false;

  constructor(
    private readonly productsService: ProductsService,
    private readonly variantsService: ProductVariantsService,
    private readonly imageService: ImageService,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    // Iniciar cargando la estructura de ejemplo
    this.loadSampleJson();
  }

  ngOnDestroy(): void {
    // Revocar blob URLs para liberar memoria
    this.mediaAssets.forEach((a) => {
      if (a.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(a.previewUrl);
      }
    });
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MEDIA ASSET POOL (CARGA MASIVA DE IMÁGENES)
  // ═══════════════════════════════════════════════════════════════════════════

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    this.addFilesToPool(files);
    input.value = '';
  }

  onDropFiles(event: DragEvent): void {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (!files.length) return;

    this.addFilesToPool(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private addFilesToPool(files: File[]): void {
    const newAssets: MediaAsset[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'queued',
    }));

    this.mediaAssets = [...this.mediaAssets, ...newAssets];
    this.processUploadQueue();
  }

  async processUploadQueue(): Promise<void> {
    const queued = this.mediaAssets.filter((a) => a.status === 'queued' || a.status === 'error');
    if (!queued.length || this.isUploadingMedia) return;

    this.isUploadingMedia = true;
    let succeeded = 0;
    let failed = 0;
    const total = queued.length;

    for (const asset of queued) {
      if (!asset.file) {
        continue;
      }
      asset.status = 'uploading';
      this.uploadProgressText = `Subiendo ${succeeded + failed + 1} de ${total}: ${asset.name}`;
      this.cdr.markForCheck();

      try {
        const res: any = await firstValueFrom(
          this.imageService.uploadImage(asset.file).pipe(takeUntil(this.destroy$))
        );
        asset.remoteUrl = res.secureUrl || res.cloudinaryUrl;
        asset.status = 'done';
        asset.error = undefined;
        succeeded++;
      } catch (err: any) {
        asset.status = 'error';
        const errMsg = err?.error?.message || err?.message || 'Error al subir a Cloudinary';
        asset.error = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg;
        failed++;
        console.error(`Error subiendo imagen "${asset.name}" a Cloudinary:`, err);
      }
    }

    this.isUploadingMedia = false;
    this.uploadProgressText = '';

    if (failed > 0) {
      this.toastService.showError(
        `Falló la subida de ${failed} de ${total} imagen(es) a Cloudinary. Revisa las tarjetas en rojo en el Asset Pool.`
      );
    } else if (succeeded > 0) {
      this.toastService.showSuccess(`Se subieron ${succeeded} imágenes a Cloudinary exitosamente`);
    }

    this.cdr.markForCheck();
  }

  retryFailedUploads(): void {
    const failedAssets = this.mediaAssets.filter((a) => a.status === 'error');
    if (!failedAssets.length) return;
    failedAssets.forEach((a) => (a.status = 'queued'));
    this.processUploadQueue();
  }

  retrySingleAsset(asset: MediaAsset): void {
    asset.status = 'queued';
    asset.error = undefined;
    this.processUploadQueue();
  }

  removeAsset(assetId: string): void {
    const index = this.mediaAssets.findIndex((a) => a.id === assetId);
    if (index !== -1) {
      const [removed] = this.mediaAssets.splice(index, 1);
      if (removed.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      this.selectedAssetIds.delete(assetId);
    }
  }

  copyAssetValue(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.showInfo(`Copiado: ${label}`);
    });
  }

  get uploadedAssetsCount(): number {
    return this.mediaAssets.filter((a) => a.status === 'done').length;
  }

  get failedAssetsCount(): number {
    return this.mediaAssets.filter((a) => a.status === 'error').length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. PARSER Y VALIDADOR DE JSON CON MAPEO INTELIGENTE
  // ═══════════════════════════════════════════════════════════════════════════

  loadSampleJson(): void {
    this.rawJson = SAMPLE_BULK_JSON;
    this.validateAndParseJson();
  }

  formatJson(): void {
    try {
      const parsed = JSON.parse(this.rawJson);
      this.rawJson = JSON.stringify(parsed, null, 2);
      this.validateAndParseJson();
      this.toastService.showSuccess('JSON formateado correctamente');
    } catch {
      this.toastService.showWarning('No se puede formatear un JSON con errores de sintaxis');
    }
  }

  clearJson(): void {
    this.rawJson = '[\n  \n]';
    this.validateAndParseJson();
  }

  downloadTemplate(): void {
    const blob = new Blob([SAMPLE_BULK_JSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-productos-moorea.json';
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.showSuccess('Plantilla descargada');
  }

  onJsonChange(): void {
    this.validateAndParseJson();
  }

  validateAndParseJson(): void {
    this.jsonSyntaxError = null;
    this.parsedProducts = [];

    if (!this.rawJson.trim()) return;

    let items: any[];
    try {
      const parsed = JSON.parse(this.rawJson);
      if (!Array.isArray(parsed)) {
        this.jsonSyntaxError = 'El JSON debe ser un arreglo de productos: [ { ... }, { ... } ]';
        return;
      }
      items = parsed;
    } catch (e: any) {
      this.jsonSyntaxError = e.message || 'Error de sintaxis en el JSON';
      return;
    }

    this.parsedProducts = items.map((rawItem, idx) => {
      const errors: string[] = [];

      // Validaciones de CreateProductDto
      if (!rawItem.code || typeof rawItem.code !== 'string') {
        errors.push('El campo "code" es requerido y debe ser texto.');
      }
      if (!rawItem.name || typeof rawItem.name !== 'string' || rawItem.name.length < 2) {
        errors.push('El campo "name" es requerido (mínimo 2 caracteres).');
      }
      if (!rawItem.brand || typeof rawItem.brand !== 'string') {
        errors.push('El campo "brand" es requerido.');
      }
      if (rawItem.basePrice == null || typeof rawItem.basePrice !== 'number' || rawItem.basePrice < 0) {
        errors.push('El campo "basePrice" es requerido y debe ser un número >= 0.');
      }
      if (!Array.isArray(rawItem.category) || !rawItem.category.length) {
        errors.push('El campo "category" debe ser un arreglo con al menos una categoría.');
      }

      const rawGallery: string[] = Array.isArray(rawItem.gallery) ? [...rawItem.gallery] : [];

      const variants = Array.isArray(rawItem.variants)
        ? rawItem.variants.map((v: any) => ({
            ...v,
            gallery: Array.isArray(v.gallery) ? [...v.gallery] : [],
          }))
        : undefined;

      return {
        code: rawItem.code ?? `PROD-${idx + 1}`,
        name: rawItem.name ?? 'Sin nombre',
        brand: rawItem.brand ?? '',
        model: rawItem.model ?? rawItem.name ?? '',
        description: rawItem.description,
        basePrice: Number(rawItem.basePrice ?? 0),
        discount: rawItem.discount != null ? Number(rawItem.discount) : 0,
        category: Array.isArray(rawItem.category) ? rawItem.category : [],
        tags: Array.isArray(rawItem.tags) ? rawItem.tags : [],
        gallery: rawGallery,
        resolvedGallery: [],
        specifications: rawItem.specifications,
        warranty: rawItem.warranty,
        variants,
        isValid: errors.length === 0,
        validationErrors: errors,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TABLERO INTERACTIVO ("EL PUZZLE" / MEDIA STAGING & MAPPING)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Retorna true si un asset está asignado en algún producto o variante */
  isAssetAssigned(asset: MediaAsset): boolean {
    const needleName = asset.name.toLowerCase().trim();
    const needleUrl = asset.remoteUrl?.toLowerCase().trim();

    for (const p of this.parsedProducts) {
      if (p.gallery) {
        for (const g of p.gallery) {
          const clean = g.toLowerCase().trim();
          if (clean === needleName || (needleUrl && clean === needleUrl)) return true;
        }
      }
      if (p.variants) {
        for (const v of p.variants) {
          if (v.gallery) {
            for (const vg of v.gallery) {
              const clean = vg.toLowerCase().trim();
              if (clean === needleName || (needleUrl && clean === needleUrl)) return true;
            }
          }
        }
      }
    }
    return false;
  }

  get unassignedAssets(): MediaAsset[] {
    return this.mediaAssets.filter((a) => !this.isAssetAssigned(a));
  }

  get assignedAssetsCount(): number {
    return this.mediaAssets.filter((a) => this.isAssetAssigned(a)).length;
  }

  get displayedPuzzleAssets(): MediaAsset[] {
    if (this.puzzleFilter === 'unassigned') {
      return this.unassignedAssets;
    }
    return this.mediaAssets;
  }

  toggleAssetSelection(assetId: string): void {
    if (this.selectedAssetIds.has(assetId)) {
      this.selectedAssetIds.delete(assetId);
    } else {
      this.selectedAssetIds.add(assetId);
    }
  }

  selectAllUnassigned(): void {
    this.unassignedAssets.forEach((a) => this.selectedAssetIds.add(a.id));
  }

  clearAssetSelection(): void {
    this.selectedAssetIds.clear();
  }

  /** Determina si una referencia de imagen tiene una fuente gráfica válida y disponible */
  hasValidThumbnail(imageRef: string): boolean {
    if (!imageRef) return false;
    if (this.brokenImageRefs.has(imageRef)) return false;
    if (imageRef.startsWith('http://') || imageRef.startsWith('https://') || imageRef.startsWith('blob:') || imageRef.startsWith('data:')) {
      return true;
    }
    const needle = imageRef.toLowerCase().trim();
    const asset = this.mediaAssets.find(
      (a) => a.name.toLowerCase().trim() === needle || a.remoteUrl === imageRef
    );
    return !!(asset && (asset.previewUrl || asset.remoteUrl));
  }

  onImageLoadError(imageRef: string): void {
    this.brokenImageRefs.add(imageRef);
    this.cdr.markForCheck();
  }

  isAssetValid(asset: MediaAsset): boolean {
    if (this.brokenAssetIds.has(asset.id)) return false;
    return !!(asset.previewUrl || asset.remoteUrl);
  }

  onAssetLoadError(assetId: string): void {
    this.brokenAssetIds.add(assetId);
    this.cdr.markForCheck();
  }

  /** Resuelve URL visual de miniatura para una referencia guardada en gallery */
  getAssetThumbnail(imageRef: string): string {
    if (!imageRef) return '';
    if (imageRef.startsWith('http://') || imageRef.startsWith('https://') || imageRef.startsWith('blob:') || imageRef.startsWith('data:')) {
      return imageRef;
    }
    const needle = imageRef.toLowerCase().trim();
    const asset = this.mediaAssets.find(
      (a) => a.name.toLowerCase().trim() === needle || a.remoteUrl === imageRef
    );
    if (asset) {
      return asset.previewUrl || asset.remoteUrl || imageRef;
    }
    return imageRef;
  }

  /** Retorna el estado de subida de un asset a partir de su referencia */
  getAssetStatus(imageRef: string): 'done' | 'uploading' | 'error' | 'queued' | 'not-found' {
    if (!imageRef) return 'not-found';
    if (imageRef.startsWith('http://') || imageRef.startsWith('https://')) {
      return 'done';
    }
    const needle = imageRef.toLowerCase().trim();
    const asset = this.mediaAssets.find(
      (a) => a.name.toLowerCase().trim() === needle || a.remoteUrl === imageRef
    );
    return asset ? asset.status : 'not-found';
  }

  /** Retorna el objeto MediaAsset a partir de su referencia */
  getAssetObj(imageRef: string): MediaAsset | undefined {
    if (!imageRef) return undefined;
    const needle = imageRef.toLowerCase().trim();
    return this.mediaAssets.find(
      (a) => a.name.toLowerCase().trim() === needle || a.remoteUrl === imageRef
    );
  }

  /** Agrupa las variantes de un producto por color para facilitar la asignación */
  getProductColorGroups(product?: ParsedBulkProduct | null): ColorVariantGroup[] {
    if (!product || !product.variants || !Array.isArray(product.variants) || !product.variants.length) {
      return [];
    }

    const groupsMap = new Map<string, ColorVariantGroup>();

    for (const v of product.variants) {
      if (!v) continue;
      const code = v.color?.code || v.color?.name || 'GEN';
      const name = v.color?.name || 'General';
      const hex = v.color?.hex || '#64748B';

      if (!groupsMap.has(code)) {
        groupsMap.set(code, {
          colorName: name,
          colorHex: hex,
          colorCode: code,
          variants: [],
          gallery: Array.isArray(v.gallery) ? [...v.gallery] : [],
        });
      }

      const group = groupsMap.get(code)!;
      group.variants.push(v);
      if (Array.isArray(v.gallery)) {
        v.gallery.forEach((g: string) => {
          if (g && !group.gallery.includes(g)) {
            group.gallery.push(g);
          }
        });
      }
    }

    return Array.from(groupsMap.values());
  }

  openQuickPicker(
    type: 'master' | 'color',
    productIndex: number,
    targetTitle: string,
    colorCode?: string
  ): void {
    const prod = this.parsedProducts[productIndex];
    this.quickPickerTarget = {
      type,
      productIndex,
      colorCode,
      targetTitle,
      productCode: prod?.code || '',
    };
  }

  closeQuickPicker(): void {
    this.quickPickerTarget = null;
  }

  isAssetAssignedToQuickTarget(assetName: string): boolean {
    if (!this.quickPickerTarget) return false;
    const { type, productIndex, colorCode } = this.quickPickerTarget;
    const prod = this.parsedProducts[productIndex];
    if (!prod) return false;

    if (type === 'master') {
      return (prod.gallery || []).includes(assetName);
    } else if (type === 'color' && colorCode) {
      for (const v of prod.variants || []) {
        const cCode = v.color?.code || v.color?.name || 'GEN';
        if (cCode === colorCode && (v.gallery || []).includes(assetName)) {
          return true;
        }
      }
    }
    return false;
  }

  toggleAssetInQuickPicker(assetName: string): void {
    if (!this.quickPickerTarget) return;
    const { type, productIndex, colorCode } = this.quickPickerTarget;
    const isAssigned = this.isAssetAssignedToQuickTarget(assetName);

    if (isAssigned) {
      if (type === 'master') {
        this.removeAssetFromProductMaster(productIndex, assetName);
      } else if (type === 'color' && colorCode) {
        this.removeAssetFromColorGroup(productIndex, colorCode, assetName);
      }
    } else {
      if (type === 'master') {
        this.assignAssetToProductMaster(productIndex, assetName);
      } else if (type === 'color' && colorCode) {
        this.assignAssetToColorGroup(productIndex, colorCode, assetName);
      }
    }
  }

  /** Asigna una imagen a la galería general del producto maestro */
  assignAssetToProductMaster(productIndex: number, imageRef: string): void {
    const prod = this.parsedProducts[productIndex];
    if (!prod) return;
    if (!Array.isArray(prod.gallery)) prod.gallery = [];
    if (!prod.gallery.includes(imageRef)) {
      prod.gallery.push(imageRef);
      this.toastService.showSuccess(`Foto asignada a Galería General de ${prod.code}`);
    }
    this.cdr.markForCheck();
  }

  /** Quita una imagen de la galería general (vuelve al pool huérfano) */
  removeAssetFromProductMaster(productIndex: number, imageRef: string): void {
    const prod = this.parsedProducts[productIndex];
    if (!prod || !Array.isArray(prod.gallery)) return;
    const idx = prod.gallery.indexOf(imageRef);
    if (idx !== -1) {
      prod.gallery.splice(idx, 1);
    }
    this.cdr.markForCheck();
  }

  /** Asigna una imagen a un grupo de color (propaga a todas sus variantes) */
  assignAssetToColorGroup(productIndex: number, colorCode: string, imageRef: string): void {
    const prod = this.parsedProducts[productIndex];
    if (!prod || !prod.variants) return;

    let count = 0;
    for (const v of prod.variants) {
      const cCode = v.color?.code || v.color?.name || 'GEN';
      if (cCode === colorCode) {
        if (!Array.isArray(v.gallery)) v.gallery = [];
        if (!v.gallery.includes(imageRef)) {
          v.gallery.push(imageRef);
          count++;
        }
      }
    }
    if (count > 0) {
      this.toastService.showSuccess(`Foto asignada al color [${colorCode}] de ${prod.code}`);
    }
    this.cdr.markForCheck();
  }

  /** Quita una imagen de todas las variantes de ese color (vuelve al pool) */
  removeAssetFromColorGroup(productIndex: number, colorCode: string, imageRef: string): void {
    const prod = this.parsedProducts[productIndex];
    if (!prod || !prod.variants) return;

    for (const v of prod.variants) {
      const cCode = v.color?.code || v.color?.name || 'GEN';
      if (cCode === colorCode && Array.isArray(v.gallery)) {
        const idx = v.gallery.indexOf(imageRef);
        if (idx !== -1) {
          v.gallery.splice(idx, 1);
        }
      }
    }
    this.cdr.markForCheck();
  }

  /**
   * Reordena un grupo de color dentro de las variantes del producto.
   * direction: -1 (mover hacia arriba/antes), 1 (mover hacia abajo/después).
   */
  moveColorGroup(productIndex: number, colorCode: string, direction: -1 | 1): void {
    const prod = this.parsedProducts[productIndex];
    if (!prod || !prod.variants || !prod.variants.length) return;

    const colorGroups = this.getProductColorGroups(prod);
    const currentIdx = colorGroups.findIndex((g) => g.colorCode === colorCode);
    if (currentIdx === -1) return;

    const targetIdx = currentIdx + direction;
    if (targetIdx < 0 || targetIdx >= colorGroups.length) return;

    // Obtener nuevo orden de códigos de color
    const newColorOrder = colorGroups.map((g) => g.colorCode);
    const [movedCode] = newColorOrder.splice(currentIdx, 1);
    newColorOrder.splice(targetIdx, 0, movedCode);

    // Reorganizar las variantes del producto según el nuevo orden
    const reorderedVariants: any[] = [];
    for (const cCode of newColorOrder) {
      for (const v of prod.variants) {
        const vCode = v.color?.code || v.color?.name || 'GEN';
        if (vCode === cCode) {
          reorderedVariants.push(v);
        }
      }
    }

    // Preservar cualquier variante que no haya coincidido
    for (const v of prod.variants) {
      if (!reorderedVariants.includes(v)) {
        reorderedVariants.push(v);
      }
    }

    prod.variants = reorderedVariants;
    const movedName = colorGroups[currentIdx].colorName;
    this.toastService.showSuccess(`Color "${movedName}" movido a la posición ${targetIdx + 1}`);
    this.cdr.markForCheck();
  }

  /** Asignación rápida con menú desplegable de 1 clic en la tarjeta */
  onQuickAssignChange(asset: MediaAsset, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (!value) return;

    const parts = value.split(':');
    const type = parts[0];
    const pIdx = Number(parts[1]);

    if (type === 'master') {
      this.assignAssetToProductMaster(pIdx, asset.name);
    } else if (type === 'color') {
      const colorCode = parts[2];
      this.assignAssetToColorGroup(pIdx, colorCode, asset.name);
    }

    select.value = '';
  }

  /** Asigna todas las imágenes seleccionadas en lote hacia un destino */
  assignSelectedAssetsTo(targetValue: string): void {
    if (!targetValue || this.selectedAssetIds.size === 0) return;

    const parts = targetValue.split(':');
    const type = parts[0];
    const pIdx = Number(parts[1]);

    const assetsToAssign = this.mediaAssets.filter((a) => this.selectedAssetIds.has(a.id));

    assetsToAssign.forEach((a) => {
      if (type === 'master') {
        this.assignAssetToProductMaster(pIdx, a.name);
      } else if (type === 'color') {
        const colorCode = parts[2];
        this.assignAssetToColorGroup(pIdx, colorCode, a.name);
      }
    });

    this.selectedAssetIds.clear();
    this.toastService.showSuccess(`${assetsToAssign.length} fotos asignadas correctamente`);
  }

  // ── Drag & Drop Handlers ──────────────────────────────────────────────────

  onAssetDragStart(event: DragEvent, asset: MediaAsset): void {
    this.draggedAsset = asset;
    event.dataTransfer?.setData('text/plain', asset.name);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copyMove';
    }
  }

  onAssetDragEnd(): void {
    this.draggedAsset = null;
    this.activeDropZoneId = null;
  }

  onDragOverZone(event: DragEvent, zoneId: string): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.activeDropZoneId = zoneId;
  }

  onDragLeaveZone(event: DragEvent, zoneId: string): void {
    if (this.activeDropZoneId === zoneId) {
      this.activeDropZoneId = null;
    }
  }

  onDropOnProductMaster(event: DragEvent, productIndex: number): void {
    event.preventDefault();
    this.activeDropZoneId = null;
    if (this.draggedAsset) {
      this.assignAssetToProductMaster(productIndex, this.draggedAsset.name);
      this.draggedAsset = null;
    }
  }

  onDropOnColorGroup(event: DragEvent, productIndex: number, colorCode: string): void {
    event.preventDefault();
    this.activeDropZoneId = null;
    if (this.draggedAsset) {
      this.assignAssetToColorGroup(productIndex, colorCode, this.draggedAsset.name);
      this.draggedAsset = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. GENERADOR DEL JSON RESULTANTE (SOLO LECTURA)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Genera el JSON final limpio y listo para enviarse a la base de datos,
   * reemplazando los nombres locales por las URLs seguras de Cloudinary.
   * Filtra estrictamente cualquier referencia que no sea una URL válida.
   */
  get generatedOutputJson(): string {
    const isValidHttpUrl = (str: any): boolean => {
      if (typeof str !== 'string' || !str.trim()) return false;
      try {
        const parsed = new URL(str.trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    const assetMap = new Map<string, string>();
    this.mediaAssets.forEach((a) => {
      if (a.remoteUrl) {
        assetMap.set(a.name.toLowerCase().trim(), a.remoteUrl);
      }
    });

    const output = this.parsedProducts.map((p) => {
      const resolvedMasterGallery = (p.gallery || [])
        .map((ref: string) => {
          if (isValidHttpUrl(ref)) return ref.trim();
          return assetMap.get(ref?.toLowerCase()?.trim());
        })
        .filter((url: string | undefined): url is string => !!url && isValidHttpUrl(url));

      const resolvedVariants = (p.variants || []).map((v: any) => {
        const vGallery = (v.gallery || [])
          .map((ref: string) => {
            if (isValidHttpUrl(ref)) return ref.trim();
            return assetMap.get(ref?.toLowerCase()?.trim());
          })
          .filter((url: string | undefined): url is string => !!url && isValidHttpUrl(url));
        return {
          ...v,
          gallery: vGallery,
        };
      });

      const cleanObj: any = {
        code: p.code,
        name: p.name,
        brand: p.brand,
        model: p.model,
        basePrice: p.basePrice,
        category: p.category,
        gallery: resolvedMasterGallery,
      };

      if (p.discount != null && p.discount > 0) cleanObj.discount = p.discount;
      if (p.description) cleanObj.description = p.description;
      if (p.tags && p.tags.length) cleanObj.tags = p.tags;
      if (p.specifications && Object.keys(p.specifications).length) cleanObj.specifications = p.specifications;
      if (p.warranty) cleanObj.warranty = p.warranty;
      if (resolvedVariants.length) cleanObj.variants = resolvedVariants;

      return cleanObj;
    });

    return JSON.stringify(output, null, 2);
  }

  copyGeneratedJson(): void {
    navigator.clipboard.writeText(this.generatedOutputJson).then(() => {
      this.toastService.showSuccess('JSON resultante copiado al portapapeles');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EJECUCIÓN EN LOTE (BATCH PIPELINE)
  // ═══════════════════════════════════════════════════════════════════════════

  get validProductsCount(): number {
    return this.parsedProducts.filter((p) => p.isValid).length;
  }

  get totalVariantsCount(): number {
    return this.parsedProducts.reduce((acc, p) => acc + (p.variants?.length ?? 0), 0);
  }

  get progressPercentage(): number {
    if (this.totalToProcess === 0) return 0;
    return Math.round((this.currentProcessingIndex / this.totalToProcess) * 100);
  }

  async executeBatchCreation(): Promise<void> {
    if (this.isUploadingMedia) {
      this.toastService.showWarning('Hay fotos subiéndose a Cloudinary. Por favor espera a que terminen antes de publicar el lote.');
      return;
    }

    const unuploadedAssigned = this.mediaAssets.filter(
      (a) => this.isAssetAssigned(a) && (!a.remoteUrl || a.status === 'error')
    );
    if (unuploadedAssigned.length > 0) {
      this.toastService.showError(
        `Hay ${unuploadedAssigned.length} imagen(es) asignadas que fallaron o no se han subido a Cloudinary. Revisa las tarjetas en rojo en el Asset Pool y reintenta su subida antes de publicar.`
      );
      return;
    }

    let cleanProductsToCreate: any[] = [];
    try {
      cleanProductsToCreate = JSON.parse(this.generatedOutputJson);
    } catch {
      this.toastService.showError('No se pudo procesar el JSON generado');
      return;
    }

    const validOnes = cleanProductsToCreate.filter((_, idx) => this.parsedProducts[idx]?.isValid);

    if (!validOnes.length) {
      this.toastService.showWarning('No hay productos válidos para procesar');
      return;
    }

    this.isExecuting = true;
    this.isCompleted = false;
    this.totalToProcess = validOnes.length;
    this.currentProcessingIndex = 0;

    this.batchResults = validOnes.map((p) => ({
      code: p.code,
      name: p.name,
      status: 'pending',
      message: 'En cola...',
    }));

    for (let i = 0; i < validOnes.length; i++) {
      const prod = validOnes[i];
      this.currentProcessingIndex = i + 1;
      const result = this.batchResults[i];
      this.cdr.markForCheck();

      try {
        // 1. Preparar payload del producto maestro garantizando URLs válidas
        const isValidHttpUrl = (str: any): boolean => {
          if (typeof str !== 'string' || !str.trim()) return false;
          try {
            const parsed = new URL(str.trim());
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            return false;
          }
        };

        const validMasterGallery = (prod.gallery || []).filter(isValidHttpUrl);

        const payload: any = {
          code: prod.code.trim().toUpperCase(),
          name: prod.name.trim(),
          brand: prod.brand.trim(),
          model: (prod.model || prod.name).trim(),
          description: prod.description?.trim() || undefined,
          basePrice: prod.basePrice,
          discount: prod.discount || 0,
          category: prod.category,
          tags: prod.tags || [],
          gallery: validMasterGallery,
          isActive: true,
        };

        if (prod.specifications && Object.keys(prod.specifications).length > 0) {
          payload.specifications = prod.specifications;
        }

        if (prod.warranty && prod.warranty.duration) {
          payload.warranty = prod.warranty;
        }

        // Crear producto maestro
        const createdProduct: Product = await firstValueFrom(
          this.productsService.createProduct(payload).pipe(takeUntil(this.destroy$))
        );

        const newProductId = createdProduct._id || (createdProduct as any).id;
        let createdVariantsCount = 0;

        // 2. Crear variantes anidadas (si existen)
        if (newProductId && prod.variants && prod.variants.length > 0) {
          const variantErrors: string[] = [];
          for (const variantDef of prod.variants) {
            try {
              // Normalizar size.type según SizeType enum del backend
              let normalizedSize = variantDef.size;
              if (normalizedSize && normalizedSize.type) {
                const rawType = (normalizedSize.type || '').toLowerCase().trim();
                const mappedType = rawType === 'volume' ? 'volume_l' : rawType;
                normalizedSize = {
                  ...normalizedSize,
                  type: mappedType,
                };
              }

              const variantPayload = {
                productId: newProductId,
                sku: (variantDef.sku || `${prod.code}-${Math.random().toString(36).substring(2, 6)}`).toUpperCase(),
                color: variantDef.color,
                size: normalizedSize,
                dimensions: variantDef.dimensions,
                gallery: (variantDef.gallery || []).filter(isValidHttpUrl),
                priceAdjustment: variantDef.priceAdjustment || 0,
              };

              await firstValueFrom(
                this.variantsService.createVariant(variantPayload).pipe(takeUntil(this.destroy$))
              );
              createdVariantsCount++;
            } catch (varErr: any) {
              console.warn(`Error creando variante para ${prod.code}:`, varErr);
              const vMsg = varErr?.error?.message;
              const formattedMsg = Array.isArray(vMsg) ? vMsg.join(', ') : (vMsg || 'Error al registrar variante');
              variantErrors.push(formattedMsg);
            }
          }

          if (variantErrors.length > 0) {
            result.status = createdVariantsCount > 0 ? 'success' : 'error';
            result.createdId = newProductId;
            result.variantsCreatedCount = createdVariantsCount;
            result.message = createdVariantsCount > 0
              ? `Creado con ${createdVariantsCount}/${prod.variants.length} variantes (${variantErrors[0]})`
              : `Producto creado pero fallaron sus variantes: ${variantErrors[0]}`;
          } else {
            result.status = 'success';
            result.createdId = newProductId;
            result.variantsCreatedCount = createdVariantsCount;
            result.message = createdVariantsCount > 0
              ? `Creado con éxito (${createdVariantsCount} variantes)`
              : 'Creado con éxito';
          }
        } else {
          result.status = 'success';
          result.createdId = newProductId;
          result.variantsCreatedCount = 0;
          result.message = 'Creado con éxito';
        }

      } catch (err: any) {
        result.status = 'error';
        const rawMsg = err?.error?.message;
        result.message = Array.isArray(rawMsg)
          ? rawMsg.join(' • ')
          : (rawMsg || 'Error del servidor al registrar producto');
      }

      this.cdr.markForCheck();
    }

    this.isExecuting = false;
    this.isCompleted = true;
    const successCount = this.batchResults.filter((r) => r.status === 'success').length;
    this.toastService.showSuccess(`Proceso finalizado: ${successCount} de ${validOnes.length} productos creados`);
  }

  finishAndGoToCatalog(): void {
    this.router.navigate(['/business/products']);
  }
}
