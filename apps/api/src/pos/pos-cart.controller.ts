import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import {
  AddPosCartItemDto,
  CreatePosCartDto,
  UpdatePosCartDto,
  UpdatePosCartItemDto,
} from './dto/cart.dto';
import { PosCartService } from './pos-cart.service';

@Controller('pos/cart')
@ApiTags('pos')
@TenantScoped()
@RequirePermissions('pos.access')
export class PosCartController {
  constructor(private readonly carts: PosCartService) {}

  @Post()
  @ApiOperation({ summary: 'Create the active POS cart for the open session, or return it if it exists' })
  create(@CurrentUser() actor: AuthPrincipal, @Body() dto: CreatePosCartDto) {
    return this.carts.create(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get the active POS cart' })
  current(@CurrentUser() actor: AuthPrincipal) {
    return this.carts.current(actor);
  }

  @Patch()
  @ApiOperation({ summary: 'Update customer, walk-in flag, notes, or cart-level discount' })
  update(@CurrentUser() actor: AuthPrincipal, @Body() dto: UpdatePosCartDto) {
    return this.carts.update(actor, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items and cart-level discounts from the active cart' })
  clear(@CurrentUser() actor: AuthPrincipal) {
    return this.carts.clear(actor);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a catalog variant to the active cart. Inventory is not reduced.' })
  addItem(@CurrentUser() actor: AuthPrincipal, @Body() dto: AddPosCartItemDto) {
    return this.carts.addItem(actor, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update quantity or line discount for a cart item' })
  updateItem(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Body() dto: UpdatePosCartItemDto) {
    return this.carts.updateItem(actor, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove an item from the active cart' })
  removeItem(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string) {
    return this.carts.removeItem(actor, id);
  }
}

@Controller('pos/carts')
@ApiTags('pos')
@TenantScoped()
@RequirePermissions('pos.access')
export class PosHeldCartController {
  constructor(private readonly carts: PosCartService) {}

  @Get('held')
  @ApiOperation({ summary: 'List held POS carts' })
  held(@CurrentUser() actor: AuthPrincipal) {
    return this.carts.held(actor);
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Place an active cart on hold without reserving inventory' })
  hold(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string) {
    return this.carts.hold(actor, id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a held cart. The current active cart, if any, is parked.' })
  resume(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string) {
    return this.carts.resume(actor, id);
  }
}
