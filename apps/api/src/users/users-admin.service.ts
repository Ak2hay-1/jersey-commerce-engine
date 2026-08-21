import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleCode, UserStatus } from '../prisma/client';
import type { AuthUser } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { TenantContextService } from '../common/context/tenant-context.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { toAuthUser, userAuthInclude, type UserWithAuth } from './user.mapper';
import type { AssignRoleDto, CreateUserDto, UpdateUserDto } from './dto/user-mutations.dto';
import type { SetTemporaryPasswordDto } from './dto/set-temporary-password.dto';
import type { RequestMeta } from '../auth/auth-session.service';

@Injectable()
export class UsersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateUserDto, actor: AuthPrincipal, meta: RequestMeta): Promise<AuthUser> {
    this.assertCanAssignRoles(actor, dto.roleCodes);
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId: actor.tenantId,
            email: dto.email,
            passwordHash,
            name: dto.name,
            phone: dto.phone,
            status: UserStatus.ACTIVE,
            mustChangePassword: dto.mustChangePassword === false ? false : true,
          },
        });
        const roles = await tx.role.findMany({
          where: { tenantId: actor.tenantId, code: { in: dto.roleCodes } },
        });
        if (roles.length !== dto.roleCodes.length) {
          throw new NotFoundException('One or more roles were not found.');
        }
        await tx.userRole.createMany({
          data: roles.map((role) => ({ userId: user.id, roleId: role.id, tenantId: actor.tenantId })),
        });
        return tx.user.findFirstOrThrow({ where: { id: user.id }, include: userAuthInclude });
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.USER_CREATED,
        tenantId: actor.tenantId,
        userId: actor.userId,
        entity: 'User',
        entityId: created.id,
        metadata: { email: created.email, roleCodes: dto.roleCodes },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      return toAuthUser(created as UserWithAuth);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A user with this email already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthPrincipal, meta: RequestMeta): Promise<AuthUser> {
    const target = await this.findTenantUser(id);
    this.assertCanMutateUser(actor, target);
    try {
      const updated = await this.prisma.user.update({
        where: { id: target.id },
        data: { email: dto.email, name: dto.name, phone: dto.phone },
        include: userAuthInclude,
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.USER_UPDATED,
        tenantId: actor.tenantId,
        userId: actor.userId,
        entity: 'User',
        entityId: updated.id,
        metadata: { fields: Object.keys(dto) },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      return toAuthUser(updated as UserWithAuth);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A user with this email already exists.');
      }
      throw error;
    }
  }

  async setTemporaryPassword(
    id: string,
    dto: SetTemporaryPasswordDto,
    actor: AuthPrincipal,
    meta: RequestMeta,
  ): Promise<AuthUser> {
    const target = await this.findTenantUser(id);
    if (target.id === actor.userId) {
      throw new ForbiddenException('Use change password to update your own password.');
    }
    this.assertCanMutateUser(actor, target);
    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: {
        passwordHash: await this.passwords.hash(dto.password),
        mustChangePassword: true,
        tokenVersion: { increment: 1 },
      },
      include: userAuthInclude,
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: target.id, tenantId: actor.tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.USER_TEMPORARY_PASSWORD_SET,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'User',
      entityId: updated.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return toAuthUser(updated as UserWithAuth);
  }

  async setActive(id: string, isActive: boolean, actor: AuthPrincipal, meta: RequestMeta): Promise<AuthUser> {
    const target = await this.findTenantUser(id);
    if (target.id === actor.userId) {
      throw new ForbiddenException('You cannot change your own active status.');
    }
    this.assertCanMutateUser(actor, target);
    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: {
        status: isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE,
        tokenVersion: isActive ? target.tokenVersion : { increment: 1 },
      },
      include: userAuthInclude,
    });
    if (!isActive) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: target.id, tenantId: actor.tenantId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.log({
      action: isActive ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'User',
      entityId: updated.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return toAuthUser(updated as UserWithAuth);
  }

  async getById(id: string): Promise<AuthUser> {
    return toAuthUser(await this.findTenantUser(id));
  }

  async assignRole(id: string, dto: AssignRoleDto, actor: AuthPrincipal, meta: RequestMeta): Promise<AuthUser> {
    const target = await this.findTenantUser(id);
    if (target.id === actor.userId) {
      throw new ForbiddenException('You cannot change your own roles.');
    }
    this.assertCanMutateUser(actor, target);
    this.assertCanAssignRoles(actor, [dto.roleCode]);
    const role = await this.prisma.role.findUnique({
      where: { tenantId_code: { tenantId: actor.tenantId, code: dto.roleCode } },
    });
    if (!role) {
      throw new NotFoundException('Role was not found.');
    }
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: target.id, roleId: role.id } },
      create: { userId: target.id, roleId: role.id, tenantId: actor.tenantId },
      update: {},
    });
    const updated = await this.findTenantUser(target.id);
    await this.audit.log({
      action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'User',
      entityId: target.id,
      metadata: { roleCode: dto.roleCode },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return toAuthUser(updated);
  }

  async removeRole(id: string, roleCode: RoleCode, actor: AuthPrincipal, meta: RequestMeta): Promise<AuthUser> {
    const target = await this.findTenantUser(id);
    if (target.id === actor.userId) {
      throw new ForbiddenException('You cannot change your own roles.');
    }
    this.assertCanMutateUser(actor, target);
    this.assertCanAssignRoles(actor, [roleCode]);
    if (roleCode === RoleCode.SUPER_ADMIN) {
      const superCount = await this.prisma.userRole.count({
        where: { tenantId: actor.tenantId, role: { code: RoleCode.SUPER_ADMIN } },
      });
      if (superCount <= 1 && target.userRoles.some((assignment) => assignment.role.code === RoleCode.SUPER_ADMIN)) {
        throw new ForbiddenException('The tenant must keep at least one superior admin.');
      }
    }
    if (roleCode === RoleCode.OWNER) {
      const ownerCount = await this.prisma.userRole.count({
        where: { tenantId: actor.tenantId, role: { code: RoleCode.OWNER } },
      });
      if (ownerCount <= 1 && target.userRoles.some((assignment) => assignment.role.code === RoleCode.OWNER)) {
        throw new ForbiddenException('The tenant must keep at least one owner.');
      }
    }
    const role = await this.prisma.role.findUnique({
      where: { tenantId_code: { tenantId: actor.tenantId, code: roleCode } },
    });
    if (!role) {
      throw new NotFoundException('Role was not found.');
    }
    await this.prisma.userRole.deleteMany({
      where: { userId: target.id, roleId: role.id, tenantId: actor.tenantId },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.USER_ROLE_REMOVED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'User',
      entityId: target.id,
      metadata: { roleCode },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return toAuthUser(await this.findTenantUser(target.id));
  }

  private async findTenantUser(id: string): Promise<UserWithAuth> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: this.tenantContext.currentTenantId },
      include: userAuthInclude,
    });
    if (!user) {
      throw new NotFoundException('User was not found.');
    }
    return user as UserWithAuth;
  }

  private assertCanAssignRoles(actor: AuthPrincipal, roleCodes: RoleCode[]): void {
    if (roleCodes.includes(RoleCode.SUPER_ADMIN) && !actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only a superior admin can assign the superior admin role.');
    }
    if (roleCodes.includes(RoleCode.OWNER) && !actor.roles.includes('OWNER') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only an owner or superior admin can assign the owner role.');
    }
  }

  private assertCanMutateUser(actor: AuthPrincipal, target: UserWithAuth): void {
    const targetIsSuperAdmin = target.userRoles.some((assignment) => assignment.role.code === RoleCode.SUPER_ADMIN);
    if (targetIsSuperAdmin && !actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only a superior admin can modify a superior admin account.');
    }
    const targetIsOwner = target.userRoles.some((assignment) => assignment.role.code === RoleCode.OWNER);
    if (targetIsOwner && !actor.roles.includes('OWNER') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only an owner or superior admin can modify an owner account.');
    }
  }
}
