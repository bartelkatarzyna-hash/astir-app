import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import { validateEnv } from './env'

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Local backend runs read the repo-root .env; real process env
      // (e.g. from Docker Compose) still takes precedence over both.
      envFilePath: ['.env', '../.env'],
    }),
  ],
})
export class ConfigModule {}
