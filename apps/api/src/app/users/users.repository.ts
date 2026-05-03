import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { AppUser } from '@vectorgraph/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

export type StoredUser = AppUser & { passwordHash?: string };

@Injectable()
export class UsersRepository implements OnModuleInit {
  private collection!: Collection<StoredUser>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection = this.database.collection<StoredUser>('users');
    await this.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await this.collection.createIndex({ githubId: 1 }, { unique: true, sparse: true });
  }

  create(user: StoredUser) {
    return this.collection.insertOne(user).then(() => user);
  }

  findById(id: string) {
    return this.collection.findOne({ id }, { projection: { _id: 0 } });
  }

  findByEmail(email: string) {
    return this.collection.findOne({ email }, { projection: { _id: 0 } });
  }

  findByGithubId(githubId: string) {
    return this.collection.findOne({ githubId }, { projection: { _id: 0 } });
  }

  update(id: string, patch: Partial<StoredUser>) {
    return this.collection.findOneAndUpdate(
      { id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  }

  delete(id: string) {
    return this.collection.deleteOne({ id });
  }
}