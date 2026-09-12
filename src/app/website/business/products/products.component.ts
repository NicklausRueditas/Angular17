import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Product, ProductCatalog } from '../../../core/interfaces/product.interface';
import { ProductsService } from '../../../core/services/catalog/products.service';
import { SellersService } from '../../../core/services/catalog/sellers.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UpdateProductDto } from '../../../core/dtos/update-product.dto';
import { ImageService } from '../../../core/services/utils/image.service';
import { ProductVariantsService } from '../../../core/services/catalog/product-variants.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
})
export class ProductsComponent implements OnInit {
  // Product data
  products: Product[] = [];
  filteredProducts: Product[] = [];
  catalogs: ProductCatalog[] = [];
  filteredCatalogs: ProductCatalog[] = [];

  // UI state
  isAddModalOpen = false;
  isEditMode = false;
  selectedProduct: Product | null = null;
  viewMode: 'grid' | 'table' = 'table';
  isLoading = false;
  togglingId: string | null = null;

  // Pagination
  currentPage = 1;
  itemsPerPage = 12;
  totalItems = 0;

  // Search and filters
  searchTerm = '';
  selectedCategory = '';
  selectedBrand = '';
  activeFilter: 'all' | 'active' | 'inactive' = 'all';
  sortBy: 'name' | 'basePrice' | 'date' = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Statistics
  stats = {
    totalProducts: 0,
    activeProducts: 0,
    totalCategories: 0,
    totalBrands: 0
  };

  /** true cuando el usuario autenticado tiene rol 'seller' (catálogo filtrado) */
  isSeller = false;

  /** true cuando el usuario autenticado tiene rol 'admin' */
  isAdmin = false;

  /** ID del seller cuando el admin navega desde /business/sellers/:id */
  ownerFilter: string | null = null;

  /** Nombre del seller para el banner de contexto */
  ownerName = '';

  constructor(
    private productsService: ProductsService,
    private sellersService: SellersService,
    private authService: AuthService,
    private imageService: ImageService,
    private variantsService: ProductVariantsService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.isSeller = this.authService.hasRole('seller');
    this.isAdmin = this.authService.hasRole('admin');
    this.ownerFilter = this.route.snapshot.queryParamMap.get('owner');
    this.ownerName = this.route.snapshot.queryParamMap.get('ownerName') ?? '';
    this.loadProducts();
  }

  /**
   * Carga el catálogo según el rol del usuario autenticado.
   * - Admin/Worker: GET /product/all  (todos los productos agrupados)
   * - Seller:       GET /product/my-catalog  (solo los suyos)
   */
  loadProducts(): void {
    this.isLoading = true;

    // Admin viendo catálogo de un seller específico via query param ?owner=:id
    if (this.ownerFilter && !this.isSeller) {
      this.productsService.getProductsByOwner(this.ownerFilter).subscribe({
        next: (result: any) => {
          const products = result.data ?? result ?? [];
          const total = result.total ?? products.length;
          const label = this.ownerName ? `Catálogo de ${this.ownerName}` : 'Catálogo del Seller';
          this.catalogs = [{ owner: this.ownerFilter!, label, total, products }];
          this.products = products;
          this.totalItems = total;
          this.resolveVariantsImages(products);
        },
        error: () => { this.isLoading = false; }
      });
      return;
    }

    if (this.isSeller) {
      this.sellersService.getMyCatalog(this.currentPage, this.itemsPerPage).subscribe({
        next: (result) => {
          this.totalItems = result?.total ?? 0;
          const products = result?.data ?? [];

          const myCatalog: ProductCatalog = {
            owner: this.authService.getCurrentUser()?._id ?? 'me',
            label: 'Mi Catálogo',
            total: this.totalItems,
            products: products
          };
          this.catalogs = [myCatalog];
          this.products = products;

          this.resolveVariantsImages(products);
        },
        error: (err) => {
          console.error('Error cargando catálogo del seller:', err);
          this.isLoading = false;
        }
      });
    } else {
      this.productsService.getAdminCatalog().subscribe({
        next: (result) => {
          this.totalItems = result?.total ?? 0;
          this.catalogs = result?.catalogs ?? [];
          this.products = this.catalogs.flatMap(c => c.products);

          this.resolveVariantsImages(this.products);
        },
        error: (err) => {
          console.error('Error cargando catálogo admin:', err);
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Asigna imágenes de miniatura inmediatas y resuelve variantes en segundo plano
   */
  private resolveVariantsImages(products: Product[]): void {
    if (!products || products.length === 0) {
      this.applyFilters();
      this.calculateStats();
      this.isLoading = false;
      return;
    }

    // Paso 1: Asignar de inmediato cualquier imagen disponible para evitar parpadeos
    products.forEach(p => {
      if (!p.firstVariantImage) {
        p.firstVariantImage = p.gallery?.[0] || (p.thumbnailGallery?.[0] as any)?.image || null;
      }
    });

    this.applyFilters();
    this.calculateStats();
    this.isLoading = false;

    // Paso 2: Enriquecer con la imagen de la primera variante si el maestro no tenía foto
    products.forEach(product => {
      if (!product.firstVariantImage) {
        this.variantsService.getVariantsByProduct(product._id).subscribe({
          next: (variants) => {
            const firstWithImage = variants?.find(v => v.gallery && v.gallery.length > 0);
            if (firstWithImage?.gallery?.[0]) {
              product.firstVariantImage = firstWithImage.gallery[0];
            }
          },
          error: () => {}
        });
      }
    });
  }

  /**
   * Apply search and filters to products
   */
  applyFilters(): void {
    const term = this.searchTerm ? this.searchTerm.toLowerCase().trim() : '';

    this.filteredCatalogs = this.catalogs.map(cat => {
      let filtered = [...cat.products];

      // Search filter
      if (term) {
        filtered = filtered.filter(p => {
          const categoryMatch = Array.isArray(p.category)
            ? p.category.some(c => c.toLowerCase().includes(term))
            : (typeof p.category === 'string' && (p.category as string).toLowerCase().includes(term));
          return (p.name && p.name.toLowerCase().includes(term)) ||
            (p.brand && p.brand.toLowerCase().includes(term)) ||
            (p.code && p.code.toLowerCase().includes(term)) ||
            categoryMatch;
        });
      }

      // Category filter
      if (this.selectedCategory) {
        filtered = filtered.filter(p =>
          Array.isArray(p.category) ? p.category.includes(this.selectedCategory) : p.category === this.selectedCategory
        );
      }

      // Brand filter
      if (this.selectedBrand) {
        filtered = filtered.filter(p => p.brand === this.selectedBrand);
      }

      // Active filter
      if (this.activeFilter !== 'all') {
        filtered = filtered.filter(p => {
          if (this.activeFilter === 'active') return p.isActive === true;
          if (this.activeFilter === 'inactive') return p.isActive === false;
          return true;
        });
      }

      // Sort
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (this.sortBy) {
          case 'name':
            comparison = (a.name || '').localeCompare(b.name || '');
            break;
          case 'basePrice':
            comparison = (a.basePrice || 0) - (b.basePrice || 0);
            break;
          case 'date':
            comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            break;
        }
        return this.sortOrder === 'asc' ? comparison : -comparison;
      });

      return {
        ...cat,
        products: filtered
      };
    }).filter(cat => cat.products.length > 0);

    this.filteredProducts = this.filteredCatalogs.flatMap(c => c.products);
  }

  /**
   * Cambia el filtro rápido de estado (Todos / Activos / Inactivos)
   */
  setActiveFilter(filter: 'all' | 'active' | 'inactive'): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  /**
   * Limpia el término de búsqueda
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  /**
   * Carga una imagen por defecto en caso de error
   */
  setDefaultImage(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/placeholder.svg';
  }

  /**
   * Calculate dashboard statistics
   */
  calculateStats(): void {
    this.stats.totalProducts = this.totalItems || this.products.length;
    this.stats.activeProducts = this.products.filter(p => p.isActive === true).length;

    const allCategories = this.products.flatMap(p =>
      Array.isArray(p.category) ? p.category : (p.category ? [p.category] : [])
    );
    this.stats.totalCategories = new Set(allCategories.filter(Boolean)).size;

    this.stats.totalBrands = new Set(this.products.map(p => p.brand).filter(Boolean)).size;
  }

  /** Porcentaje de productos activos sobre el total */
  get activePercentage(): number {
    if (!this.stats.totalProducts) return 0;
    return Math.round((this.stats.activeProducts / this.stats.totalProducts) * 100);
  }

  /** Indica si hay algún filtro actualmente aplicado */
  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedCategory || this.selectedBrand || this.activeFilter !== 'all');
  }

  /**
   * Get unique categories from products
   */
  get categories(): string[] {
    const allCategories = this.products.flatMap(p =>
      Array.isArray(p.category) ? p.category : (p.category ? [p.category] : [])
    );
    return Array.from(new Set(allCategories)).filter(Boolean).sort();
  }

  /**
   * Get unique brands from products
   */
  get brands(): string[] {
    return Array.from(new Set(this.products.map(p => p.brand).filter(Boolean))).sort();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadProducts();
  }

  changeItemsPerPage(size: number): void {
    this.itemsPerPage = Number(size);
    this.currentPage = 1;
    this.loadProducts();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'table' : 'grid';
  }

  /** Activa o desactiva el producto con indicador de carga */
  toggleProductActive(product: Product): void {
    const activate = !product.isActive;
    this.togglingId = product._id;

    const req$ = activate
      ? this.productsService.activateProduct(product._id)
      : this.productsService.deactivateProduct(product._id);

    req$.subscribe({
      next: (updated) => {
        this.togglingId = null;
        const idx = this.products.findIndex(p => p._id === updated._id);
        if (idx !== -1) {
          this.products[idx].isActive = updated.isActive;
        }
        this.applyFilters();
        this.calculateStats();
      },
      error: (err) => {
        this.togglingId = null;
        console.error('Error cambiando estado del producto:', err);
      },
    });
  }

  /** Elimina el producto permanentemente (hard delete) */
  deleteProduct(id: string): void {
    if (!confirm('¿Eliminar permanentemente este producto? Esta acción no se puede deshacer.')) return;

    const product = this.products.find(p => p._id === id);

    // Eliminar imágenes de Cloudinary si existen
    if (product?.gallery) {
      product.gallery.forEach(imageUrl => {
        const idLink = imageUrl.split('/').pop();
        if (idLink) {
          this.imageService.deleteImage(idLink).subscribe({
            next: () => {},
            error: () => {},
          });
        }
      });
    }

    this.productsService.deleteProduct(id).subscribe({
      next: () => { this.loadProducts(); },
      error: (err) => console.error('Error eliminando producto:', err),
    });
  }

  getDisplayedRange(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `Mostrando ${start} a ${end} de ${this.totalItems} productos`;
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage) || 1;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedBrand = '';
    this.activeFilter = 'all';
    this.sortBy = 'date';
    this.sortOrder = 'desc';
    this.applyFilters();
  }
}
