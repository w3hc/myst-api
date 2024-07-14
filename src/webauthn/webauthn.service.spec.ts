import { Test, TestingModule } from '@nestjs/testing';
import { WebAuthnService } from './webauthn.service';
import * as jsonfile from 'jsonfile';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

jest.mock('jsonfile');
jest.mock('@simplewebauthn/server');

const uint8ArrayToBase64url = (array: Uint8Array): string => {
  const base64 = Buffer.from(array).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

describe('WebAuthnService', () => {
  let service: WebAuthnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebAuthnService],
    }).compile();

    service = module.get<WebAuthnService>(WebAuthnService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should generate registration options', async () => {
      const userId = 'testuser';
      const mockDb = { users: [] };
      (jsonfile.readFile as jest.Mock).mockResolvedValue(mockDb);
      (jsonfile.writeFile as jest.Mock).mockResolvedValue(undefined);

      const mockOptions = {
        rp: { name: 'My Application', id: 'localhost' },
        user: { id: new Uint8Array(), name: userId, displayName: userId },
        challenge: 'challenge',
        pubKeyCredParams: [],
        timeout: 60000,
        attestation: 'direct',
      };

      (generateRegistrationOptions as jest.Mock).mockReturnValue(mockOptions);

      const options = await service.register(userId);
      expect(options).toEqual(mockOptions);
      expect(jsonfile.writeFile).toHaveBeenCalledWith(expect.any(String), {
        users: [{ id: userId, credentials: [] }],
      });
    });

    it('should throw an error if user already exists', async () => {
      const userId = 'testuser';
      const mockDb = { users: [{ id: userId, credentials: [] }] };
      (jsonfile.readFile as jest.Mock).mockResolvedValue(mockDb);

      await expect(service.register(userId)).rejects.toThrow(
        'User already exists',
      );
    });
  });

  describe('verifyRegistration', () => {
    it('should verify registration response', async () => {
      const userId = 'testuser';
      const mockDb = { users: [{ id: userId, credentials: [] }] };
      (jsonfile.readFile as jest.Mock).mockResolvedValue(mockDb);
      (jsonfile.writeFile as jest.Mock).mockResolvedValue(undefined);

      const attResp = {
        response: { clientDataJSON: { challenge: 'challenge' } },
      };
      const mockVerified = {
        verified: true,
        registrationInfo: { credentialID: 'credentialId' },
      };

      (verifyRegistrationResponse as jest.Mock).mockResolvedValue(mockVerified);

      const result = await service.verifyRegistration(userId, attResp);
      expect(result).toEqual({ verified: true });
      expect(jsonfile.writeFile).toHaveBeenCalledWith(expect.any(String), {
        users: [
          {
            id: userId,
            credentials: [
              {
                ...mockVerified.registrationInfo,
                credentialID: expect.any(Uint8Array),
              },
            ],
          },
        ],
      });
    });

    it('should throw an error if user is not found', async () => {
      const userId = 'testuser';
      const mockDb = { users: [] };
      (jsonfile.readFile as jest.Mock).mockResolvedValue(mockDb);

      await expect(service.verifyRegistration(userId, {})).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('login', () => {
    it('should generate authentication options', async () => {
      const userId = 'testuser';
      const mockDb = {
        users: [
          {
            id: userId,
            credentials: [
              {
                credentialID: new Uint8Array(),
                type: 'public-key',
                transports: [],
              },
            ],
          },
        ],
      };
      (jsonfile.readFile as jest.Mock).mockResolvedValue(mockDb);

      const mockOptions = {
        challenge: 'challenge',
        allowCredentials: [],
        rpID: 'localhost',
        timeout: 60000,
      };
      (generateAuthenticationOptions as jest.Mock).mockReturnValue(mockOptions);

      const options = await service.login(userId);
      expect(options).toEqual(mockOptions);
    });

    it('should throw an error if user is not found', async () => {
      const userId = 'testuser';
      const mockDb = { users: [] };
      (jsonfile.readFile as jest.Mock).mockResolvedValue(mockDb);

      await expect(service.login(userId)).rejects.toThrow('User not found');
    });
  });

  describe('verifyAssertion', () => {
    it('should verify authentication response', async () => {
      const userId = 'testuser';
      const credentialID = new Uint8Array([1, 2, 3, 4]);
      const base64CredentialID = uint8ArrayToBase64url(credentialID);
      const mockDb = {
        users: [{ id: userId, credentials: [{ credentialID }] }],
      };
      (jsonfile.readFile as jest.Mock).mockResolvedValue(mockDb);

      const attResp = {
        id: base64CredentialID,
        response: { clientDataJSON: { challenge: 'challenge' } },
      };
      const mockVerified = { verified: true };

      (verifyAuthenticationResponse as jest.Mock).mockResolvedValue(
        mockVerified,
      );

      const result = await service.verifyAssertion(userId, attResp);
      expect(result).toEqual({ verified: true });
    });

    it('should throw an error if user is not found', async () => {
      const userId = 'testuser';
      const mockDb = { users: [] };
      (jsonfile.readFile as jest.Mock).mockResolvedValue(mockDb);

      await expect(service.verifyAssertion(userId, {})).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw an error if authenticator is not found', async () => {
      const userId = 'testuser';
      const mockDb = { users: [{ id: userId, credentials: [] }] };
      (jsonfile.readFile as jest.Mock).mockResolvedValue(mockDb);

      const attResp = {
        id: 'nonexistentCredentialId',
        response: { clientDataJSON: { challenge: 'challenge' } },
      };

      await expect(service.verifyAssertion(userId, attResp)).rejects.toThrow(
        'Authenticator not found',
      );
    });
  });
});
