import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection, Db, Document, MongoClient } from 'mongodb';

@Injectable()
export class MongoDatabaseService implements OnModuleInit, OnApplicationShutdown {
  private client: MongoClient;
  private db?: Db;

  constructor(private readonly config: ConfigService) {
    this.client = new MongoClient(this.config.get('MONGODB_URI') ?? process.env.MONGODB_URI!);
  }

  async onModuleInit() {
    await this.client.connect();
    this.db = this.client.db('vectorgraph');
  }

  collection<T extends Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('Mongo database is not initialized');
    }

    return this.db.collection<T>(name);
  }

  async onApplicationShutdown() {
    await this.client.close();
  }
}