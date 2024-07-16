import { IsNotEmpty, IsString, IsNumber, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FileUploadDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  originalname: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  mimetype: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  size: number;

  @IsDate()
  @IsNotEmpty()
  @ApiProperty()
  uploadDate: Date;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  description: string;
}
