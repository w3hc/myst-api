import { Injectable, Logger } from '@nestjs/common';
import * as jsonfile from 'jsonfile';
import * as path from 'path';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticatorDevice,
} from '@simplewebauthn/typescript-types';

interface User {
  id: string;
  credentials: AuthenticatorDevice[];
}

@Injectable()
export class WebAuthnService {
  private dbFilePath: string;
  private readonly logger = new Logger(WebAuthnService.name);
  private challenges: { [userId: string]: string } = {}; // Temporary store for challenges

  constructor() {
    this.dbFilePath = path.resolve(__dirname, '..', 'users.json');
    this.logger.log(`Database file path set to ${this.dbFilePath}`);
  }

  private async readDatabase(): Promise<{ users: User[] }> {
    this.logger.log('Attempting to read database');
    try {
      const data = await jsonfile.readFile(this.dbFilePath);
      this.logger.log('Database read successfully');
      return data;
    } catch (err) {
      this.logger.error('Error reading users.json file:', err.message);
      throw new Error('Error reading users.json file');
    }
  }

  private async writeDatabase(data: { users: User[] }): Promise<void> {
    this.logger.log('Attempting to write to database');
    try {
      await jsonfile.writeFile(this.dbFilePath, data);
      this.logger.log('Database written successfully');
    } catch (err) {
      this.logger.error('Error writing users.json file:', err.message);
      throw new Error('Error writing users.json file');
    }
  }

  private base64urlToUint8Array(base64url: string): Uint8Array {
    this.logger.log('Converting base64url to Uint8Array');
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = Buffer.from(base64, 'base64');
    this.logger.log('Conversion successful');
    return new Uint8Array(rawData);
  }

  public uint8ArrayToBase64url(array: Uint8Array): string {
    this.logger.log('Converting Uint8Array to base64url');
    const base64 = Buffer.from(array).toString('base64');
    const result = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    this.logger.log('Conversion successful');
    return result;
  }

  async register(
    userId: string,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    this.logger.log(`Registering user with ID: ${userId}`);
    const db = await this.readDatabase();
    const user = db.users.find((user) => user.id === userId);
    if (user) {
      this.logger.error('User already exists');
      throw new Error('User already exists');
    }

    const userID = new TextEncoder().encode(userId);

    this.logger.log('Generating registration options');
    const options = await generateRegistrationOptions({
      rpName: 'My Application',
      rpID: 'localhost',
      userID,
      userName: userId,
    });

    // Store the challenge for later verification
    this.challenges[userId] = options.challenge;

    this.logger.log('Pushing new user to database');
    db.users.push({ id: userId, credentials: [] });
    await this.writeDatabase(db);

    this.logger.log('Returning registration options');
    return options;
  }

  async verifyRegistration(
    userId: string,
    attResp: any,
  ): Promise<{ verified: boolean }> {
    this.logger.log(`Verifying registration for user with ID: ${userId}`);
    const db = await this.readDatabase();
    const user = db.users.find((user) => user.id === userId);

    if (!user) {
      this.logger.error('User not found');
      throw new Error('User not found');
    }

    const expectedChallenge = this.challenges[userId];
    if (!expectedChallenge) {
      this.logger.error('No challenge found for this user');
      throw new Error('No challenge found for this user');
    }

    this.logger.log('Verifying registration response');
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response: attResp,
      expectedChallenge: expectedChallenge,
      expectedOrigin: 'http://localhost:3001',
      expectedRPID: 'localhost',
    });

    if (verified && registrationInfo) {
      this.logger.log(
        'Registration response verified, updating user credentials',
      );
      const convertedCredential = {
        ...registrationInfo,
        credentialID: this.uint8ArrayToBase64url(
          registrationInfo.credentialID as unknown as Uint8Array,
        ),
        credentialPublicKey: this.uint8ArrayToBase64url(
          registrationInfo.credentialPublicKey as unknown as Uint8Array,
        ),
      };

      user.credentials.push(
        convertedCredential as unknown as AuthenticatorDevice,
      );
      await this.writeDatabase(db);

      // Clean up the stored challenge
      delete this.challenges[userId];
    } else {
      this.logger.log('Registration verification failed');
    }

    return { verified };
  }

  async login(userId: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
    this.logger.log(`Generating login options for user with ID: ${userId}`);
    const db = await this.readDatabase();
    const user = db.users.find((user) => user.id === userId);

    if (!user) {
      this.logger.error('User not found');
      throw new Error('User not found');
    }

    this.logger.log('Generating authentication options');
    const options = await generateAuthenticationOptions({
      allowCredentials: user.credentials.map((cred) => ({
        id: cred.credentialID as unknown as string,
        type: 'public-key',
        transports: ['usb', 'ble', 'nfc', 'internal'],
      })),
      rpID: 'localhost',
    });

    // Store the challenge for later verification
    this.challenges[userId] = options.challenge;

    this.logger.log('Returning authentication options');
    return options;
  }

  async verifyAssertion(
    userId: string,
    attResp: any,
  ): Promise<{ verified: boolean }> {
    this.logger.log(`Verifying assertion for user with ID: ${userId}`);
    const db = await this.readDatabase();
    const user = db.users.find((user) => user.id === userId);

    if (!user) {
      this.logger.error('User not found');
      throw new Error('User not found');
    }

    const expectedChallenge = this.challenges[userId];
    if (!expectedChallenge) {
      this.logger.error('No challenge found for this user');
      throw new Error('No challenge found for this user');
    }

    const authenticator = user.credentials.find(
      (cred) => cred.credentialID === attResp.id,
    );

    if (!authenticator) {
      this.logger.error('Authenticator not found');
      throw new Error('Authenticator not found');
    }

    this.logger.log('Verifying authentication response');
    const authenticatorWithStringID = {
      ...authenticator,
      credentialID: this.base64urlToUint8Array(
        authenticator.credentialID as unknown as string,
      ),
      credentialPublicKey: this.base64urlToUint8Array(
        authenticator.credentialPublicKey as unknown as string,
      ),
    };

    const { verified } = await verifyAuthenticationResponse({
      response: attResp,
      expectedChallenge: expectedChallenge,
      expectedOrigin: 'http://localhost:3001',
      expectedRPID: 'localhost',
      authenticator: authenticatorWithStringID as any,
    });

    if (verified) {
      this.logger.log('Authentication verified');
      // Clean up the stored challenge
      delete this.challenges[userId];
    } else {
      this.logger.log('Authentication verification failed');
    }

    return { verified };
  }
}
