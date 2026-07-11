import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { isAdminEmail } from './admin'
import { AuthenticatedUser } from './current-user.decorator'

// Gates admin-only endpoints. Runs after JwtAuthGuard (which populates
// request.user), so a controller uses both: @UseGuards(JwtAuthGuard, AdminGuard).
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    if (!isAdminEmail(request.user?.email)) {
      throw new ForbiddenException('Admin access required')
    }
    return true
  }
}
