import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import type { StoreContactMessageDto } from './dto/store-contact.dto';

@Injectable()
export class StoreContactService {
  constructor(
    private readonly audit: AuditService,
    private readonly notifications: NotificationSettingsService,
  ) {}

  async submit(tenantId: string, dto: StoreContactMessageDto): Promise<{ ok: true }> {
    const name = dto.name.trim();
    const email = dto.email.trim();
    const phone = dto.phone?.trim() || null;
    const message = dto.message.trim();

    await this.audit.log({
      action: AUDIT_ACTIONS.CONTACT_MESSAGE_CREATED,
      tenantId,
      entity: 'ContactMessage',
      entityId: email.toLowerCase(),
      metadata: { name, email, phone, messagePreview: message.slice(0, 240) },
    });

    const lines = [
      'Jerzyfy contact form',
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      '',
      message,
    ].filter((line): line is string => line !== null);

    this.notifications.schedule(tenantId, 'CONTACT_MESSAGE', lines.join('\n'));

    return { ok: true };
  }
}
