import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/storage.types';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  extensionForMime,
  IMAGE_MAX_BYTES,
  sniffImageMime,
} from '../storage/image-validation';
import { toChromeConfig, toHomepageConfig, toFooterConfig } from '../store/store-catalog.mapper';
import type { UpdateWebsiteSettingsDto } from './dto/website-mutations.dto';

type UploadedFile = { buffer: Buffer; size: number; mimetype?: string };

@Injectable()
export class WebsiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async getSettings(tenantId: string) {
    const settings = assertFound(
      await this.prisma.websiteSettings.findUnique({ where: { tenantId } }),
      'Website settings not found',
    );
    return {
      ...settings,
      footerConfig: toFooterConfig(settings.footerConfig),
      chromeConfig: toChromeConfig(settings.chromeConfig),
    };
  }

  async updateSettings(tenantId: string, dto: UpdateWebsiteSettingsDto, actor: AuthPrincipal) {
    const existing = await this.getSettings(tenantId);
    const homepageConfig = dto.homepageConfig
      ? (toHomepageConfig(dto.homepageConfig) as unknown as Prisma.InputJsonValue)
      : undefined;
    const footerConfig = dto.footerConfig
      ? (toFooterConfig(dto.footerConfig) as unknown as Prisma.InputJsonValue)
      : undefined;
    const chromeConfig = dto.chromeConfig
      ? (toChromeConfig(dto.chromeConfig) as unknown as Prisma.InputJsonValue)
      : undefined;
    const socialLinks = dto.socialLinks
      ? (Object.fromEntries(
          Object.entries(dto.socialLinks).filter(([, value]) => typeof value === 'string' && value.trim()),
        ) as Prisma.InputJsonValue)
      : undefined;
    const updated = await this.prisma.websiteSettings.update({
      where: { tenantId },
      data: {
        seoTitle: dto.seoTitle === undefined ? undefined : dto.seoTitle,
        seoDescription: dto.seoDescription === undefined ? undefined : dto.seoDescription,
        contactPhone: dto.contactPhone === undefined ? undefined : dto.contactPhone,
        contactEmail: dto.contactEmail === undefined ? undefined : dto.contactEmail,
        contactAddress: dto.contactAddress === undefined ? undefined : dto.contactAddress,
        logo: dto.logo === undefined ? undefined : dto.logo,
        favicon: dto.favicon === undefined ? undefined : dto.favicon,
        primaryColor: dto.primaryColor === undefined ? undefined : dto.primaryColor,
        secondaryColor: dto.secondaryColor === undefined ? undefined : dto.secondaryColor,
        accentColor: dto.accentColor === undefined ? undefined : dto.accentColor,
        backgroundColor: dto.backgroundColor === undefined ? undefined : dto.backgroundColor,
        foregroundColor: dto.foregroundColor === undefined ? undefined : dto.foregroundColor,
        homepageConfig,
        footerConfig,
        chromeConfig,
        socialLinks,
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.WEBSITE_SETTINGS_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'WebsiteSettings',
      entityId: updated.id,
      oldValue: {
        seoTitle: existing.seoTitle,
        seoDescription: existing.seoDescription,
        logo: existing.logo,
        favicon: existing.favicon,
      },
      newValue: {
        seoTitle: updated.seoTitle,
        seoDescription: updated.seoDescription,
        logo: updated.logo,
        favicon: updated.favicon,
      },
    });
    return {
      ...updated,
      footerConfig: toFooterConfig(updated.footerConfig),
      chromeConfig: toChromeConfig(updated.chromeConfig),
    };
  }

  async uploadMedia(tenantId: string, file: UploadedFile | undefined, actor: AuthPrincipal) {
    if (!file) {
      throw new BadRequestException('Upload an image file.');
    }
    if (file.size > IMAGE_MAX_BYTES) {
      throw new BadRequestException(`Image files must be ${IMAGE_MAX_BYTES / (1024 * 1024)}MB or smaller.`);
    }
    const sniffed = sniffImageMime(file.buffer);
    if (!sniffed || !ALLOWED_IMAGE_MIME_TYPES.includes(sniffed)) {
      throw new BadRequestException('Only JPEG, PNG, and WEBP images are allowed.');
    }
    const key = `${tenantId}/website/${randomUUID()}.${extensionForMime(sniffed)}`;
    const stored = await this.storage.put({ tenantId, key, body: file.buffer, contentType: sniffed });
    await this.audit.log({
      action: AUDIT_ACTIONS.WEBSITE_MEDIA_UPLOADED,
      tenantId,
      userId: actor.userId,
      entity: 'WebsiteMedia',
      entityId: stored.storageKey,
      metadata: { url: stored.url },
    });
    return stored;
  }
}
