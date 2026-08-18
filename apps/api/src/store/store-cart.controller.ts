import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CART_TOKEN_COOKIE } from '../auth/auth.constants';
import { StoreCartService } from './store-cart.service';
import { StoreTenantGuard, cartTokenFromRequest } from './store-tenant.guard';
import { AddStoreCartItemDto, UpdateStoreCartItemDto } from '../orders/dto/order.dto';

@Controller('store/cart')
@ApiTags('store')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: true })
@ApiHeader({ name: 'X-Cart-Token', required: false })
export class StoreCartController {
  constructor(private readonly carts: StoreCartService) {}

  @Post()
  @ApiOperation({ summary: 'Create a guest cart or resume the cart for the presented token' })
  async create(@TenantId() tenantId: string, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.carts.create(tenantId, cartTokenFromRequest(request));
    if (result.cartToken) {
      this.setCartCookie(response, request, result.cartToken);
    }
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get the current guest or customer cart' })
  get(@TenantId() tenantId: string, @Req() request: Request) {
    return this.carts.get(tenantId, cartTokenFromRequest(request));
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a purchasable variant to the cart. Price is determined server-side.' })
  addItem(@TenantId() tenantId: string, @Req() request: Request, @Body() dto: AddStoreCartItemDto) {
    return this.carts.addItem(tenantId, cartTokenFromRequest(request), dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Change cart item quantity. Quantity 0 removes the item.' })
  updateItem(
    @TenantId() tenantId: string,
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateStoreCartItemDto,
  ) {
    return this.carts.updateItem(tenantId, cartTokenFromRequest(request), id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  removeItem(@TenantId() tenantId: string, @Req() request: Request, @Param('id') id: string) {
    return this.carts.removeItem(tenantId, cartTokenFromRequest(request), id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from the cart' })
  clear(@TenantId() tenantId: string, @Req() request: Request) {
    return this.carts.clear(tenantId, cartTokenFromRequest(request));
  }

  private setCartCookie(response: Response, request: Request, token: string) {
    response.cookie(CART_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.secure,
      path: '/api/v1/store',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });
  }
}
