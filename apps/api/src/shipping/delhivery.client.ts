import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { DelhiveryEnvironment, DelhiveryServiceMode } from '@jersey-commerce/types';

export type DelhiveryCredentials = {
  apiToken: string;
  environment: DelhiveryEnvironment;
};

export type DelhiveryWarehouse = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  pickupLocation: string;
};

export type DelhiveryCreateShipmentInput = {
  orderNumber: string;
  paymentMode: 'Prepaid' | 'COD';
  codAmount: number;
  weightKg: number;
  shippingMode: DelhiveryServiceMode;
  warehouse: DelhiveryWarehouse;
  consignee: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  productsDescription: string;
  totalAmount: number;
};

export type DelhiveryCreateShipmentResult = {
  waybill: string;
  trackingUrl: string;
  labelUrl: string | null;
  providerRef: string | null;
  providerStatus: string | null;
  raw: unknown;
};

export type DelhiveryServiceabilityResult = {
  postalCode: string;
  serviceable: boolean;
  codAvailable: boolean;
  prepaidAvailable: boolean;
  message?: string;
};

export type DelhiveryRateResult = {
  mode: DelhiveryServiceMode;
  amount: number;
  estimatedDays: string | null;
};

@Injectable()
export class DelhiveryClient {
  private readonly logger = new Logger(DelhiveryClient.name);

  baseUrl(environment: DelhiveryEnvironment): string {
    return environment === 'PRODUCTION' ? 'https://track.delhivery.com' : 'https://staging-express.delhivery.com';
  }

  async checkServiceability(
    credentials: DelhiveryCredentials,
    postalCode: string,
  ): Promise<DelhiveryServiceabilityResult> {
    const pin = postalCode.trim();
    const url = `${this.baseUrl(credentials.environment)}/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pin)}`;
    try {
      const payload = await this.getJson<{
        delivery_codes?: Array<{
          postal_code?: {
            pin?: string | number;
            pre_paid?: string;
            cash?: string;
            cod?: string;
          };
        }>;
      }>(url, credentials.apiToken);
      const entry = payload.delivery_codes?.[0]?.postal_code;
      if (!entry) {
        return {
          postalCode: pin,
          serviceable: false,
          codAvailable: false,
          prepaidAvailable: false,
          message: 'Pincode is not serviceable by Delhivery.',
        };
      }
      const prepaid = String(entry.pre_paid ?? '').toUpperCase() === 'Y';
      const cod = String(entry.cash ?? entry.cod ?? '').toUpperCase() === 'Y';
      return {
        postalCode: pin,
        serviceable: prepaid || cod,
        codAvailable: cod,
        prepaidAvailable: prepaid,
      };
    } catch (error) {
      this.logger.warn(`Delhivery serviceability failed for ${pin}: ${String(error)}`);
      return {
        postalCode: pin,
        serviceable: false,
        codAvailable: false,
        prepaidAvailable: false,
        message: 'Unable to verify pincode with Delhivery.',
      };
    }
  }

  async estimateRates(
    credentials: DelhiveryCredentials,
    input: {
      originPostalCode: string;
      destinationPostalCode: string;
      weightKg: number;
      codAmount?: number;
      modes: DelhiveryServiceMode[];
    },
  ): Promise<DelhiveryRateResult[]> {
    const results: DelhiveryRateResult[] = [];
    for (const mode of input.modes) {
      const md = mode === 'EXPRESS' ? 'E' : 'S';
      const params = new URLSearchParams({
        md,
        ss: 'Delivered',
        d_pin: input.destinationPostalCode.trim(),
        o_pin: input.originPostalCode.trim(),
        cgm: String(Math.max(1, Math.round(input.weightKg * 1000))),
      });
      if (input.codAmount && input.codAmount > 0) {
        params.set('pt', 'COD');
      }
      const url = `${this.baseUrl(credentials.environment)}/api/kinko/v1/invoice/charges/.json?${params.toString()}`;
      try {
        const payload = await this.getJson<
          Array<{ total_amount?: number | string; charged_weight?: number; estimated_delivery_days?: string }>
        >(url, credentials.apiToken);
        const row = Array.isArray(payload) ? payload[0] : null;
        const amount = Number(row?.total_amount ?? 0);
        if (Number.isFinite(amount) && amount >= 0) {
          results.push({
            mode,
            amount,
            estimatedDays: row?.estimated_delivery_days ? String(row.estimated_delivery_days) : null,
          });
        }
      } catch (error) {
        this.logger.warn(`Delhivery rate quote failed (${mode}): ${String(error)}`);
      }
    }
    return results;
  }

  async createShipment(
    credentials: DelhiveryCredentials,
    input: DelhiveryCreateShipmentInput,
  ): Promise<DelhiveryCreateShipmentResult> {
    const url = `${this.baseUrl(credentials.environment)}/api/cmu/create.json`;
    const shipment = {
      name: input.consignee.name,
      add: input.consignee.address,
      pin: input.consignee.postalCode,
      city: input.consignee.city,
      state: input.consignee.state,
      country: input.consignee.country || 'India',
      phone: input.consignee.phone,
      order: input.orderNumber,
      payment_mode: input.paymentMode,
      return_pin: input.warehouse.postalCode,
      return_city: input.warehouse.city,
      return_phone: input.warehouse.phone,
      return_add: input.warehouse.address,
      return_state: input.warehouse.state,
      return_country: input.warehouse.country || 'India',
      products_desc: input.productsDescription,
      hsn_code: '',
      cod_amount: input.paymentMode === 'COD' ? input.codAmount : 0,
      order_date: null,
      total_amount: input.totalAmount,
      seller_add: input.warehouse.address,
      seller_name: input.warehouse.name,
      seller_inv: '',
      quantity: '1',
      waybill: '',
      shipment_width: '10',
      shipment_height: '5',
      weight: String(Math.max(0.1, input.weightKg)),
      shipping_mode: input.shippingMode === 'EXPRESS' ? 'Express' : 'Surface',
      address_type: 'home',
    };
    const body = new URLSearchParams();
    body.set(
      'format',
      'json',
    );
    body.set(
      'data',
      JSON.stringify({
        shipments: [shipment],
        pickup_location: {
          name: input.warehouse.pickupLocation || input.warehouse.name,
          add: input.warehouse.address,
          city: input.warehouse.city,
          pin_code: input.warehouse.postalCode,
          country: input.warehouse.country || 'India',
          phone: input.warehouse.phone,
        },
      }),
    );
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${credentials.apiToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
    const rawText = await response.text();
    let raw: unknown = rawText;
    try {
      raw = JSON.parse(rawText) as unknown;
    } catch {
      /* keep text */
    }
    if (!response.ok) {
      throw new BadRequestException(`Delhivery create shipment failed (${response.status}).`);
    }
    const record = raw as {
      packages?: Array<{ waybill?: string; status?: string; refnum?: string; remarks?: string[] }>;
      success?: boolean;
      rmk?: string;
      Error?: string;
    };
    const pkg = record.packages?.[0];
    const waybill = pkg?.waybill?.trim();
    if (!waybill) {
      const message = record.rmk || record.Error || pkg?.remarks?.join('; ') || 'Delhivery did not return a waybill.';
      throw new BadRequestException(message);
    }
    const trackingUrl = `https://www.delhivery.com/track/package/${encodeURIComponent(waybill)}`;
    let labelUrl: string | null = null;
    try {
      labelUrl = await this.fetchLabelUrl(credentials, waybill);
    } catch {
      labelUrl = null;
    }
    return {
      waybill,
      trackingUrl,
      labelUrl,
      providerRef: pkg?.refnum ?? null,
      providerStatus: pkg?.status ?? 'Created',
      raw,
    };
  }

  async track(credentials: DelhiveryCredentials, waybill: string): Promise<{ status: string | null; raw: unknown }> {
    const url = `${this.baseUrl(credentials.environment)}/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`;
    const payload = await this.getJson<{
      ShipmentData?: Array<{ Shipment?: { Status?: { Status?: string; StatusType?: string } } }>;
    }>(url, credentials.apiToken);
    const status =
      payload.ShipmentData?.[0]?.Shipment?.Status?.Status ??
      payload.ShipmentData?.[0]?.Shipment?.Status?.StatusType ??
      null;
    return { status, raw: payload };
  }

  async fetchLabelUrl(credentials: DelhiveryCredentials, waybill: string): Promise<string> {
    const url = `${this.baseUrl(credentials.environment)}/api/p/packing_slip?wbns=${encodeURIComponent(waybill)}&pdf=true`;
    const payload = await this.getJson<{ packages?: Array<{ pdf_download_link?: string; waybill?: string }> }>(
      url,
      credentials.apiToken,
    );
    const link = payload.packages?.[0]?.pdf_download_link;
    if (!link) {
      throw new BadRequestException('Delhivery packing slip is not available yet.');
    }
    return link;
  }

  private async getJson<T>(url: string, apiToken: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Token ${apiToken}`,
        Accept: 'application/json',
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new BadRequestException(`Delhivery request failed (${response.status}).`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BadRequestException('Delhivery returned an invalid response.');
    }
  }
}
