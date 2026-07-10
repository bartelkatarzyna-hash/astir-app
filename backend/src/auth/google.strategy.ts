import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Profile, Strategy } from 'passport-google-oauth20'
import { GoogleProfileInput } from '../users/users.service'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      // Placeholders keep the app bootable before Google credentials exist;
      // sign-in fails at Google's consent screen until they are set.
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'google-client-id-not-set',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') || 'google-client-secret-not-set',
      // The callback goes through the Next.js /api proxy so the browser only
      // ever talks to the frontend origin, matching the API boundary rules.
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:5173/api/auth/google/callback',
      scope: ['openid', 'email', 'profile'],
    })
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleProfileInput {
    const email = profile.emails?.[0]?.value
    if (!email) {
      throw new UnauthorizedException('Google account did not provide an email address')
    }
    return {
      googleId: profile.id,
      email,
      name: profile.displayName || email,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    }
  }
}
