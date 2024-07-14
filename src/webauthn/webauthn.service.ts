import { Injectable } from '@nestjs/common';
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

  constructor() {
    this.dbFilePath = path.resolve(__dirname, '..', 'users.json');
  }

  private async readDatabase(): Promise<{ users: User[] }> {
    return jsonfile.readFile(this.dbFilePath);
  }

  private async writeDatabase(data: { users: User[] }): Promise<void> {
    return jsonfile.writeFile(this.dbFilePath, data);
  }

  private base64urlToUint8Array(base64url: string): Uint8Array {
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = Buffer.from(base64, 'base64');
    return new Uint8Array(rawData);
  }

  public uint8ArrayToBase64url(array: Uint8Array): string {
    const base64 = Buffer.from(array).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async register(
    userId: string,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const db = await this.readDatabase();
    const user = db.users.find((user) => user.id === userId);
    if (user) {
      throw new Error('User already exists');
    }

    const userID = new TextEncoder().encode(userId);

    const options = generateRegistrationOptions({
      rpName: 'My Application',
      rpID: 'localhost',
      userID,
      userName: userId,
    });

    db.users.push({ id: userId, credentials: [] });
    await this.writeDatabase(db);

    return options;
  }

  async verifyRegistration(
    userId: string,
    attResp: any,
  ): Promise<{ verified: boolean }> {
    const db = await this.readDatabase();
    const user = db.users.find((user) => user.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response: attResp,
      expectedChallenge: attResp.response.clientDataJSON.challenge,
      expectedOrigin: 'http://localhost:3000',
      expectedRPID: 'localhost',
    });

    if (verified && registrationInfo) {
      const convertedCredential = {
        ...registrationInfo,
        credentialID: this.base64urlToUint8Array(
          registrationInfo.credentialID as unknown as string,
        ),
      };

      user.credentials.push(convertedCredential);
      await this.writeDatabase(db);
    }

    return { verified };
  }

  async login(userId: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const db = await this.readDatabase();
    const user = db.users.find((user) => user.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    const options = generateAuthenticationOptions({
      allowCredentials: user.credentials.map((cred) => ({
        id: this.uint8ArrayToBase64url(cred.credentialID),
        type: 'public-key',
        transports: ['usb', 'ble', 'nfc', 'internal'],
      })),
      rpID: 'localhost',
    });

    return options;
  }

  async verifyAssertion(
    userId: string,
    attResp: any,
  ): Promise<{ verified: boolean }> {
    const db = await this.readDatabase();
    const user = db.users.find((user) => user.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    const authenticator = user.credentials.find(
      (cred) => this.uint8ArrayToBase64url(cred.credentialID) === attResp.id,
    );

    if (!authenticator) {
      throw new Error('Authenticator not found');
    }

    const authenticatorWithStringID = {
      ...authenticator,
      credentialID: this.uint8ArrayToBase64url(authenticator.credentialID),
    };

    const { verified } = await verifyAuthenticationResponse({
      response: attResp,
      expectedChallenge: attResp.response.clientDataJSON.challenge,
      expectedOrigin: 'http://localhost:3000',
      expectedRPID: 'localhost',
      authenticator: authenticatorWithStringID,
    });

    return { verified };
  }
}
