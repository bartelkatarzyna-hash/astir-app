import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { Strategy } from 'passport-jwt'
import { SESSION_COOKIE } from './auth.constants'
import { AuthenticatedUser } from './current-user.decorator'

type JwtPayload = {
  sub: string
  email: string
}

function cookieExtractor(request: Request): string | null {
  const cookies = request.cookies as Record<string, string> | undefined
  return cookies?.[SESSION_COOKIE] ?? null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'dev-only-jwt-secret',
    })
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
    }
  }
}
