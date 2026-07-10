import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export type AuthenticatedUser = {
  userId: string
  email: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest<{ user?: unknown }>()
    return request.user
  },
)
