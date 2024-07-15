import { Module } from '@nestjs/common';
import { FileModule } from './file/file.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [FileModule, AuthModule],
})
export class AppModule {}
