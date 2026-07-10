import { Controller, Get, Post, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Response } from 'express'
import { GoogleProfileInput } from '../users/users.service'
import { SESSION_COOKIE } from './auth.constants'
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import { GoogleAuthGuard } from './google-auth.guard'

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  signInWithGoogle(): void {
    // The guard redirects to Google's consent screen before this runs.
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @CurrentUser() profile: GoogleProfileInput,
    @Res() res: Response,
  ): Promise<void> {
    const { token } = await this.authService.signInWithGoogle(profile)
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    })
    res.redirect(this.configService.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173')
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { status: 'ok' } {
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    return { status: 'ok' }
  }
}
