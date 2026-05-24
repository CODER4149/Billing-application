export interface AiProvider {
  scanInvoiceOcr(image: Blob): Promise<Record<string, unknown>>;
  predictPayment(invoiceId: string): Promise<{ probability: number; expectedDate: string }>;
  detectAnomalies(period: { from: string; to: string }): Promise<Array<{ type: string; message: string }>>;
  revenueForecast(months: number): Promise<Array<{ month: string; amount: number }>>;
}

export class NoOpAiProvider implements AiProvider {
  async scanInvoiceOcr(): Promise<Record<string, unknown>> {
    return {};
  }
  async predictPayment(): Promise<{ probability: number; expectedDate: string }> {
    return { probability: 0, expectedDate: "" };
  }
  async detectAnomalies(): Promise<Array<{ type: string; message: string }>> {
    return [];
  }
  async revenueForecast(): Promise<Array<{ month: string; amount: number }>> {
    return [];
  }
}
