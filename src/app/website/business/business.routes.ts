import { Routes } from '@angular/router';
import { InventoryComponent } from './inventory/inventory.component';

export const businessRoutes: Routes = [
    {
        path: 'inventory',
        component: InventoryComponent,
      }
];