import { HttpInterceptorFn } from '@angular/common/http';

export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
