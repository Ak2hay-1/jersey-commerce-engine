import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ClosePosSessionDto, OpenPosSessionDto } from './dto/session.dto';
import { PosSessionService } from './pos-session.service';

@Controller('pos/sessions')
@ApiTags('pos')
@TenantScoped()
@RequirePermissions('pos.access')
export class PosSessionController {
  constructor(private readonly sessions: PosSessionService) {}

  @Post('open')
  @RequirePermissions('pos.access', 'pos.session.open')
  @ApiOperation({ summary: 'Open a cashier POS session and record opening cash' })
  open(@CurrentUser() actor: AuthPrincipal, @Body() dto: OpenPosSessionDto) {
    return this.sessions.open(actor, dto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the caller’s open POS session' })
  current(@CurrentUser() actor: AuthPrincipal) {
    return this.sessions.current(actor);
  }

  @Get()
  @ApiOperation({ summary: 'List POS sessions. Cashiers see their own; managers see the tenant.' })
  list(@CurrentUser() actor: AuthPrincipal, @Query() query: PaginationQueryDto) {
    return this.sessions.list(actor, query);
  }

  @Post(':id/close')
  @RequirePermissions('pos.access', 'pos.session.close')
  @ApiOperation({ summary: 'Close a POS session and record closing cash against expected cash' })
  close(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Body() dto: ClosePosSessionDto) {
    return this.sessions.close(actor, id, dto);
  }
}
