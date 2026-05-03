import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ReposService } from './repos.service';
import { CreateRepoDto } from '@vectorgraph/shared-types';

@Controller('repos')
export class ReposController {
  constructor(private svc: ReposService) {}
  @Get()         findAll()                        { return this.svc.findAll(); }
  @Get(':id')    findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post()        create(@Body() dto: CreateRepoDto){ return this.svc.create(dto); }
  @Delete(':id') remove(@Param('id') id: string)  { return this.svc.remove(id); }
}
