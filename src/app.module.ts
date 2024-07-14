import { Module, OnModuleInit } from '@nestjs/common';
import { WebAuthnService } from './webauthn/webauthn.service';
import { WebAuthnController } from './webauthn/webauthn.controller';
import { DbService } from './db/db.service';

@Module({
  imports: [],
  controllers: [WebAuthnController],
  providers: [WebAuthnService, DbService],
  exports: [DbService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly dbService: DbService) {}

  onModuleInit() {
    this.dbService.copyDatabase();
  }
}
