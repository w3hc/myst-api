import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './api-key/api-key.guard';

@Module({
  providers: [AuthService, ApiKeyGuard],
  exports: [AuthService],
})
export class AuthModule {}
