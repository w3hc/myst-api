import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { Response } from 'express';
import * as path from 'path';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { FileUploadDto } from '../dto/file-upload.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('file')
@ApiBearerAuth()
@Controller('file')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiHeader({
    name: 'api-key',
    description: 'API key',
    required: true,
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    this.logger.log('Upload request received');
    this.logger.debug(`File details: ${JSON.stringify(file)}`);

    const metadata: FileUploadDto = {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date(),
    };
    this.logger.debug(`File metadata: ${JSON.stringify(metadata)}`);

    await this.fileService.saveFileMetadata(metadata);
    this.logger.log('File metadata saved successfully');

    return {
      message: 'File uploaded successfully',
      metadata,
    };
  }

  @Get('files/:artist')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'api-key',
    description: 'API key',
    required: true,
  })
  async getAllFiles(@Param('artist') artist: string): Promise<FileUploadDto[]> {
    this.logger.log(`Fetching all files for artist: ${artist}`);
    const files = await this.fileService.getAllFilesForArtist(artist);
    this.logger.debug(`Files fetched: ${JSON.stringify(files)}`);
    return files;
  }

  @Get('download/latest/:artist/:userAddress')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'api-key',
    description: 'API key',
    required: true,
  })
  async downloadLatestFile(
    @Param('artist') artist: string,
    @Param('userAddress') userAddress: string,
    @Res() res: Response,
  ) {
    this.logger.log(
      `Download latest file request received for artist: ${artist}, userAddress: ${userAddress}`,
    );

    const isWhiteListed = await this.fileService.isAddressWhiteListed(
      artist,
      userAddress,
    );
    this.logger.debug(`Is address white-listed: ${isWhiteListed}`);

    if (!isWhiteListed) {
      this.logger.warn(`User address ${userAddress} is not white-listed`);
      return res
        .status(403)
        .json({ message: 'Forbidden: Address is not white-listed' });
    }

    const metadata = await this.fileService.getLatestFileForArtist(artist);
    if (!metadata) {
      this.logger.warn(`No files found for artist: ${artist}`);
      return res.status(404).json({ message: 'No files found for artist' });
    }

    this.logger.debug(`Latest file metadata: ${JSON.stringify(metadata)}`);

    const allFiles = await this.fileService.getAllFilesForArtist(artist);
    const filePath = path.join(
      __dirname,
      '../../dist/uploads',
      metadata.filename,
    );

    const filenames = allFiles.map((file) => file.filename);
    this.logger.debug(`All filenames: ${JSON.stringify(filenames)}`);

    return res.status(200).json({
      message: 'File fetched successfully',
      filePath,
      latestFile: {
        filename: metadata.filename,
        originalname: metadata.originalname,
        mimetype: metadata.mimetype,
        size: metadata.size,
        uploadDate: metadata.uploadDate,
      },
      filenames,
      allFiles,
    });
  }
}
