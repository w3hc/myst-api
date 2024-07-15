import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { FileUploadDto } from '../dto/file-upload.dto';

@Injectable()
export class FileService {
  private readonly uploadPath = './dist/uploads'; // Update to dist/uploads
  private readonly dbFilePath = './dist/db.json'; // Update to dist/db.json

  async saveFileMetadata(metadata: FileUploadDto): Promise<void> {
    const data = await this.readDatabase();
    data.files.push(metadata);
    await this.writeDatabase(data);
  }

  async getFileMetadata(filename: string): Promise<FileUploadDto | undefined> {
    const data = await this.readDatabase();
    return data.files.find((file) => file.filename === filename);
  }

  private async readDatabase(): Promise<any> {
    if (!fs.existsSync(this.dbFilePath)) {
      await this.writeDatabase({ files: [] });
    }
    const rawData = fs.readFileSync(this.dbFilePath);
    return JSON.parse(rawData.toString());
  }

  private async writeDatabase(data: any): Promise<void> {
    fs.writeFileSync(this.dbFilePath, JSON.stringify(data, null, 2));
  }
}
