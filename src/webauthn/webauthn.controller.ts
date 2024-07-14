import { Controller, Post, Body } from '@nestjs/common';
import { WebAuthnService } from './webauthn.service';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import {
  RegisterDto,
  FinishRegisterDto,
  LoginDto,
  FinishLoginDto,
} from './dto/webauthn.dto';

@ApiTags('webauthn')
@Controller('webauthn')
export class WebAuthnController {
  constructor(private readonly webauthnService: WebAuthnService) {}

  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 200,
    description: 'Registration options generated successfully.',
  })
  async register(@Body() data: RegisterDto) {
    try {
      const options = await this.webauthnService.register(data.userId);
      return options;
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('register/finish')
  @ApiBody({ type: FinishRegisterDto })
  @ApiResponse({
    status: 200,
    description: 'Registration completed successfully.',
  })
  async finishRegister(@Body() data: FinishRegisterDto) {
    try {
      const result = await this.webauthnService.verifyRegistration(
        data.userId,
        data.attResp,
      );
      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login options generated successfully.',
  })
  async login(@Body() data: LoginDto) {
    try {
      const options = await this.webauthnService.login(data.userId);
      return options;
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('login/finish')
  @ApiBody({ type: FinishLoginDto })
  @ApiResponse({ status: 200, description: 'Login completed successfully.' })
  async finishLogin(@Body() data: FinishLoginDto) {
    try {
      const result = await this.webauthnService.verifyAssertion(
        data.userId,
        data.attResp,
      );
      return result;
    } catch (error) {
      return { error: error.message };
    }
  }
}
