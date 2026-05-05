import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

export interface CliAuthSession {
  deviceCodeHash: string;
  userCode: string;
  status: 'pending' | 'approved' | 'denied';
  userId?: string;
  // When approved, the issued tokens are stored here for ONE-time pickup.
  approvedTokens?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class CliSessionsRepository implements OnModuleInit {
  private collection!: Collection<CliAuthSession>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection =
      this.database.collection<CliAuthSession>('cli_auth_sessions');
    await this.collection.createIndex({ deviceCodeHash: 1 }, { unique: true });
    await this.collection.createIndex({ userCode: 1 }, { unique: true });
    await this.collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    );
  }

  create(session: CliAuthSession) {
    return this.collection.insertOne(session).then(() => session);
  }

  findByDeviceHash(deviceCodeHash: string) {
    return this.collection.findOne(
      { deviceCodeHash },
      { projection: { _id: 0 } },
    );
  }

  findByUserCode(userCode: string) {
    return this.collection.findOne({ userCode }, { projection: { _id: 0 } });
  }

  approve(
    userCode: string,
    userId: string,
    approvedTokens: NonNullable<CliAuthSession['approvedTokens']>,
  ) {
    return this.collection.updateOne(
      { userCode, status: 'pending' },
      { $set: { status: 'approved', userId, approvedTokens } },
    );
  }

  consume(deviceCodeHash: string) {
    return this.collection.deleteOne({ deviceCodeHash });
  }
}
