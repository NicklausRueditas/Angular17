import { Routes } from '@angular/router';
import { StoreComponent } from './store/store.component';
import { HomeComponent } from './home/home.component';
import { ClaimsComponent } from './claims/claims.component';

export const publicRoutes: Routes = [
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'store',
    component: StoreComponent,
  },
  {
    path: 'claims',
    component: ClaimsComponent,
  }
];
