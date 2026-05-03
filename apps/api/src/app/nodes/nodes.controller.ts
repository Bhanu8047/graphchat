import { Controller, Post, Delete, Param, Body } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from '@vectorgraph/shared-types';

@Controller('nodes')
export class NodesController {
  constructor(private svc: NodesService) {}
  @Post()        create(@Body() dto: CreateNodeDto)  { return this.svc.create(dto); }
  @Delete(':id') remove(@Param('id') id: string)     { return this.svc.remove(id); }
}
