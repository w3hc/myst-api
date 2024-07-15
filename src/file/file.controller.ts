import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Res,
  UseGuards,
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
    const metadata: FileUploadDto = {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date(),
    };
    await this.fileService.saveFileMetadata(metadata);
    return {
      message: 'File uploaded successfully',
      metadata,
    };
  }

  @Get('download/:filename')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({
    name: 'api-key',
    description: 'API key',
    required: true,
  })
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const metadata = await this.fileService.getFileMetadata(filename);
    if (!metadata) {
      return res.status(404).json({ message: 'File not found' });
    }
    const filePath = path.join(
      __dirname,
      '../../dist/uploads',
      metadata.filename,
    ); // Construct the file path
    return res.download(filePath, metadata.originalname);
  }
}
