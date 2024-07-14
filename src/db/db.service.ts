import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';

@Injectable()
export class DbService {
  private readonly logger = new Logger(DbService.name);

  async copyDatabase() {
    const source = path.join(__dirname, '..', '..', 'users.json');
    const destination = path.join(__dirname, '..', 'users.json');

    try {
      await fs.copy(source, destination);
      this.logger.log('users.json was copied to dist folder successfully.');
    } catch (err) {
      this.logger.error('Error copying users.json file:', err);
    }
  }
}
