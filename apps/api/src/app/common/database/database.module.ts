import { Global, Module } from '@nestjs/common';
import { MongoDatabaseService } from './mongo-database.service';

@Global()
@Module({
  providers: [MongoDatabaseService],
  exports: [MongoDatabaseService],
})
export class DatabaseModule {}