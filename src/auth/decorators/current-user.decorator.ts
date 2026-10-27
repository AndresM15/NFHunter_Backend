import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Lo que la JwtStrategy deja en request.user tras validar el token
export interface UsuarioAutenticado {
  id: string;
  email: string;
  role: string;
  nickname: string;
}

// Atajo para no repetir @Request() req y req.user en cada controlador
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    return ctx.switchToHttp().getRequest().user;
  },
);
