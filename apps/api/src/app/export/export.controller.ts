import { Controller, Get, Param } from '@nestjs/common';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private svc: ExportService) {}
  @Get(':id') export(@Param('id') id: string) { return this.svc.exportRepo(id); }
}
