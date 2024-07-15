import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly validApiKeys = ['1234']; // Replace with your actual API keys

  validateApiKey(apiKey: string): boolean {
    return this.validApiKeys.includes(apiKey);
  }
}
