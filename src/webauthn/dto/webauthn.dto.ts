import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  userId: string;
}

export class FinishRegisterDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  attResp: any;
}

export class LoginDto {
  @ApiProperty()
  userId: string;
}

export class FinishLoginDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  attResp: any;
}
