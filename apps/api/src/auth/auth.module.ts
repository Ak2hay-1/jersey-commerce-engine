import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { ServerEnv } from '@jersey-commerce/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSessionController } from './auth-session.controller';
import { AuthSessionService } from './auth-session.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthRateLimiterService } from './rate-limit/auth-rate-limiter.service';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ServerEnv, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRATION', { infer: true }) },
      }),
    }),
  ],
  controllers: [AuthController, AuthSessionController],
  providers: [
    AuthService,
    AuthSessionService,
    PasswordService,
    TokenService,
    JwtStrategy,
    AuthRateLimiterService,
  ],
  exports: [PasswordService, TokenService, AuthSessionService, AuthRateLimiterService],
})
export class AuthModule {}
