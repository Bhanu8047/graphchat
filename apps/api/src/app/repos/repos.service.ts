import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoVectorService } from '@vectorgraph/vector-client';
import { Repository, CreateRepoDto } from '@vectorgraph/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ReposService implements OnModuleInit {
  private mongo: MongoVectorService;
  constructor(private cfg: ConfigService) {
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
  }
  async onModuleInit() { await this.mongo.connect(); }

  findAll()                     { return this.mongo.getAllRepos(); }
  async findOne(id: string)     {
    const r = await this.mongo.getRepo(id);
    if (!r) throw new NotFoundException(`Repo ${id} not found`);
    return r;
  }
  async create(dto: CreateRepoDto): Promise<Repository> {
    const repo: Repository = {
      id: uuid(), nodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...dto,
    };
    await this.mongo.saveRepo(repo);
    return repo;
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.mongo.deleteRepo(id);
  }
}
