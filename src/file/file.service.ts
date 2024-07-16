import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { FileUploadDto } from '../dto/file-upload.dto';

@Injectable()
export class FileService implements OnModuleInit {
  private readonly logger = new Logger(FileService.name);
  private readonly uploadPath = './dist/uploads'; // Update to dist/uploads
  private readonly dbFilePath = './dist/uploads/db.json'; // Update to dist/uploads/db.json

  onModuleInit() {
    this.logger.log('Initializing FileService...');

    if (!fs.existsSync(this.uploadPath)) {
      this.logger.warn(
        `Upload path ${this.uploadPath} does not exist. Creating...`,
      );
      fs.mkdirSync(this.uploadPath, { recursive: true });
      this.logger.log(`Upload path ${this.uploadPath} created.`);
    }

    if (!fs.existsSync(this.dbFilePath)) {
      this.logger.warn(
        `Database file ${this.dbFilePath} does not exist. Creating...`,
      );
      this.writeDatabase({
        files: [],
        whiteListedAddresses: ['0xD8a394e7d7894bDF2C57139fF17e5CBAa29Dd977'],
      });
      this.logger.log(
        `Database file ${this.dbFilePath} created with initial structure.`,
      );
    }

    this.logger.log('FileService initialized.');
  }

  async saveFileMetadata(metadata: FileUploadDto): Promise<void> {
    this.logger.log(`Saving file metadata for file: ${metadata.filename}`);
    const data = await this.readDatabase();
    data.files.push(metadata);
    await this.writeDatabase(data);
    this.logger.log(
      `File metadata for ${metadata.filename} saved successfully.`,
    );
  }

  async getFileMetadata(filename: string): Promise<FileUploadDto | undefined> {
    this.logger.log(`Fetching file metadata for file: ${filename}`);
    const data = await this.readDatabase();
    const metadata = data.files.find((file) => file.filename === filename);
    if (metadata) {
      this.logger.log(`File metadata for ${filename} found.`);
    } else {
      this.logger.warn(`File metadata for ${filename} not found.`);
    }
    return metadata;
  }

  async isAddressWhiteListed(userAddress: string): Promise<boolean> {
    const data = await this.readDatabase();
    this.logger.log(`userAddress: ${userAddress}`);
    this.logger.log(`data: ${data.whiteListedAddresses[0]}`);

    const isWhiteListed = data.whiteListedAddresses.includes(userAddress);

    if (isWhiteListed) {
      this.logger.log(`User address ${userAddress} is white-listed.`);
    } else {
      this.logger.warn(`User address ${userAddress} is not white-listed.`);
    }
    return isWhiteListed;
  }

  private async readDatabase(): Promise<any> {
    this.logger.log('Reading database...');
    if (!fs.existsSync(this.dbFilePath)) {
      this.logger.warn(
        `Database file ${this.dbFilePath} does not exist. Creating...`,
      );
      await this.writeDatabase({
        files: [],
        whiteListedAddresses: ['0xD8a394e7d7894bDF2C57139fF17e5CBAa29Dd977'],
      });
    }
    const rawData = fs.readFileSync(this.dbFilePath);
    this.logger.log('Database read successfully.');
    return JSON.parse(rawData.toString());
  }

  private async writeDatabase(data: any): Promise<void> {
    this.logger.log('Writing to database...');
    fs.writeFileSync(this.dbFilePath, JSON.stringify(data, null, 2));
    this.logger.log('Database written successfully.');
  }
}
