import { Routes } from '@angular/router';
import { StoreComponent } from './store/store.component';
import { HomeComponent } from './home/home.component';

export const publicRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'store',
    component: StoreComponent,
  },
];
