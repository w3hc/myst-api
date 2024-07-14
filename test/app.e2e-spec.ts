import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import * as jsonfile from 'jsonfile';
import * as path from 'path';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const dbFilePath = path.resolve(__dirname, '..', 'src', 'users.json');

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    const db = await jsonfile.readFile(dbFilePath);
    db.users = db.users.filter((user) => user.id !== 'testuser');
    await jsonfile.writeFile(dbFilePath, db);
  });

  it('/webauthn/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/webauthn/register')
      .send({ userId: 'testuser' })
      .expect(201)
      .then((response) => {
        expect(response.body).toHaveProperty('rp');
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('challenge');
      });
  });
});
