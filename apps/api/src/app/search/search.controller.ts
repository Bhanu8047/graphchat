import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private svc: SearchService) {}
  @Get() search(@Query() dto: any) { return this.svc.search(dto); }
}
