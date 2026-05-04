import { Controller, Get, Query } from '@nestjs/common';
import { AuthenticatedUser } from '@vectorgraph/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private svc: SearchService) {}

  @Get()
  search(@Query() dto: SearchQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.search(dto, user.id);
  }
}
