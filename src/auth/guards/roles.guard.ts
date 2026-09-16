import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtener los roles requeridos para la ruta actual
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si la ruta no tiene el decorador @Roles, permitimos el acceso
    if (!requiredRoles) {
      return true;
    }

    // 2. Obtener el usuario autenticado del request
    const { user } = context.switchToHttp().getRequest();

    // 3. Verificar si el usuario tiene el rol necesario
    return requiredRoles.includes(user?.role);
  }
}