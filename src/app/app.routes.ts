import { Routes} from '@angular/router';

export const appRoutes: Routes = [ 
  {
    // Ruta raíz, carga las rutas del módulo 'public'
    path: 'home',
    loadComponent: () => import('./website/public/public.component'),
    loadChildren: () => import('./website/public/public.routes').then(m => m.publicRoutes),
  },
  {
    // Ruta para la sección de 'business', carga las rutas del módulo 'business'
    path: 'business',
    loadChildren: () => import('./website/business/business.routes').then(m => m.businessRoutes)
  },
  {
    // Ruta para la sección de 'company', carga las rutas del módulo 'company'
    path: 'company',
    loadChildren: () => import('./website/company/company.routes').then(m => m.companyRoutes)
  },
  {
    // Ruta para la sección de 'auth', carga las rutas del módulo 'auth'
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes)
  },
  {
    // Ruta para cualquier otra ruta no definida, redirige a la raíz
    path: '**',
    redirectTo: 'home'
  }
]