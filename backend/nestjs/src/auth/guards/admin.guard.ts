import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role !== 'admin') {
      throw new ForbiddenException(
        'สิทธิ์การเข้าถึงถูกปฏิเสธ: อนุญาตเฉพาะผู้ดูแลระบบเท่านั้น',
      );
    }

    return true;
  }
}
