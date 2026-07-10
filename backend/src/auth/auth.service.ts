import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { User } from '@prisma/client'
import { GoogleProfileInput, UsersService } from '../users/users.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signInWithGoogle(profile: GoogleProfileInput): Promise<{ user: User; token: string }> {
    const user = await this.usersService.upsertFromGoogleProfile(profile)
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    })
    return { user, token }
  }
}
