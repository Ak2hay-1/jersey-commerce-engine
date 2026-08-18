import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import { toPaginationArgs, toPaginationMeta, type PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { parseMoney } from '../catalog/money';
import { throwUniqueConflict } from '../catalog/unique';
import { canViewAllPosData, expectedCash, money } from './pos-money';
import { toSessionDto } from './pos.mapper';
import type { ClosePosSessionDto, OpenPosSessionDto } from './dto/session.dto';
import { assertFound } from '../common/http/assert-found';

const sessionUser = { select: { id: true, name: true, email: true } } as const;

@Injectable()
export class PosSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async open(actor: AuthPrincipal, dto: OpenPosSessionDto) {
    const tenantId = actor.tenantId;
    const openingCash = parseMoney(dto.openingCash, 'openingCash');
    const existing = await this.prisma.posSession.findFirst({
      where: { tenantId, userId: actor.userId, status: 'OPEN' },
    });
    if (existing) {
      throw new ConflictException('An open POS session already exists for this cashier.');
    }
    try {
      const session = await this.prisma.posSession.create({
        data: {
          tenantId,
          userId: actor.userId,
          status: 'OPEN',
          openingCash,
          expectedCash: openingCash,
          notes: dto.notes?.trim() || null,
        },
        include: { user: sessionUser },
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.POS_SESSION_OPENED,
        tenantId,
        userId: actor.userId,
        entity: 'PosSession',
        entityId: session.id,
        metadata: { openingCash: openingCash.toFixed(2) },
      });
      return toSessionDto(session);
    } catch (error) {
      throwUniqueConflict(error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An open POS session already exists for this cashier.');
      }
      throw error;
    }
  }

  async current(actor: AuthPrincipal) {
    const session = await this.prisma.posSession.findFirst({
      where: { tenantId: actor.tenantId, userId: actor.userId, status: 'OPEN' },
      include: { user: sessionUser },
    });
    return toSessionDto(assertFound(session, 'No open POS session'));
  }

  async list(actor: AuthPrincipal, query: PaginationQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where: Prisma.PosSessionWhereInput = {
      tenantId: actor.tenantId,
      ...(canViewAllPosData(actor) ? {} : { userId: actor.userId }),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.posSession.findMany({
        where,
        include: { user: sessionUser },
        orderBy: { openedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.posSession.count({ where }),
    ]);
    return { items: items.map(toSessionDto), meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async close(actor: AuthPrincipal, sessionId: string, dto: ClosePosSessionDto) {
    const tenantId = actor.tenantId;
    const closingCash = parseMoney(dto.closingCash, 'closingCash');
    return this.prisma.$transaction(async (raw) => {
      const tx = asTx(raw);
      const locked = await this.lock(tx, tenantId, sessionId);
      if (!canViewAllPosData(actor) && locked.userId !== actor.userId) {
        throw new ForbiddenException('You can only close your own POS session.');
      }
      if (locked.status !== 'OPEN') {
        throw new ConflictException('POS session is already closed.');
      }
      const blocking = await tx.posCart.findMany({
        where: { tenantId, posSessionId: locked.id, status: { in: ['ACTIVE', 'HELD'] } },
        include: { items: true },
      });
      const held = blocking.filter((cart) => cart.status === 'HELD');
      if (held.length > 0) {
        throw new ConflictException('Parked carts must be resumed, completed, or cleared before closing the session.');
      }
      const activeWithItems = blocking.filter((cart) => cart.status === 'ACTIVE' && cart.items.length > 0);
      if (activeWithItems.length > 0) {
        throw new ConflictException('Complete or hold the active cart before closing the session.');
      }
      await tx.posCart.updateMany({
        where: { tenantId, posSessionId: locked.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });
      const expected = expectedCash(money(locked.openingCash.toString()), money(locked.cashSales.toString()), money(locked.cashRefunds.toString()));
      const closed = await tx.posSession.update({
        where: { id: locked.id },
        data: {
          status: 'CLOSED',
          closingCash,
          expectedCash: expected,
          closedAt: new Date(),
          notes: dto.notes?.trim() || locked.notes,
        },
        include: { user: sessionUser },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.POS_SESSION_CLOSED,
          tenantId,
          userId: actor.userId,
          entity: 'PosSession',
          entityId: closed.id,
          metadata: {
            openingCash: closed.openingCash.toFixed(2),
            closingCash: closingCash.toFixed(2),
            expectedCash: expected.toFixed(2),
            cashSales: closed.cashSales.toFixed(2),
            cashRefunds: closed.cashRefunds.toFixed(2),
            cardSales: closed.cardSales.toFixed(2),
            upiSales: closed.upiSales.toFixed(2),
          },
        },
        tx,
      );
      return toSessionDto(closed);
    });
  }

  async requireOpenForUser(tenantId: string, userId: string, db: object = this.prisma) {
    const session = await asTx(db).posSession.findFirst({
      where: { tenantId, userId, status: 'OPEN' },
    });
    if (!session) {
      throw new BadRequestException('An open POS session is required.');
    }
    return session;
  }

  async lock(tx: object, tenantId: string, sessionId: string) {
    const client = asTx(tx);
    const rows = await client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM pos_sessions
      WHERE id = ${sessionId} AND tenant_id = ${tenantId}
      FOR UPDATE
    `;
    if (!rows[0]) {
      throw new BadRequestException('POS session not found.');
    }
    return client.posSession.findFirstOrThrow({ where: { id: sessionId, tenantId } });
  }
}
