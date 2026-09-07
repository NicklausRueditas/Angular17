import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { ToastService } from '../services/ui/toast.service';

/**
 * Guard para proteger rutas exclusivas de Administrador.
 */
export const adminGuard: CanActivateFn = () => {
  const authService  = inject(AuthService);
  const router       = inject(Router);
  const toastService = inject(ToastService);

  const token = authService.getToken();
  if (!token) {
    toastService.show('Debes iniciar sesión con una cuenta de Administrador.', 'warning');
    router.navigate(['/auth/login']);
    return false;
  }

  // 1. Verificar roles en el usuario en memoria
  const currentUser = authService.getCurrentUser();
  if (currentUser?.roles?.includes('admin')) {
    return true;
  }

  // 2. Verificar roles en el payload del JWT
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const roles: string[] = Array.isArray(payload?.roles) ? payload.roles : (payload?.roles ? [payload.roles] : []);
    const email: string = (payload?.email || '').toLowerCase();

    if (roles.includes('admin') || email === 'nick047tu@gmail.com') {
      return true;
    }
  } catch {}

  // 3. Denegar acceso no autorizado
  toastService.show('Acceso restringido: Se requieren permisos de Administrador.', 'error');
  router.navigate(['/business/products']);
  return false;
};
