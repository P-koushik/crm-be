interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: string;
  text: { body: string };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.apiVersion = 'v18.0';
  }

  private getApiUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  private async makeRequest(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    const response = await fetch(this.getApiUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WhatsApp API error: ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
  }

  async sendMessage(phoneNumber: string, messageText: string): Promise<{ messageId: string; waId: string }> {
    try {
      // Format phone number (remove + and add country code if needed)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const message: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: messageText,
        },
      };

      const response = await this.makeRequest(message);

      if (response.messages && response.messages.length > 0) {
        return {
          messageId: response.messages[0].id,
          waId: response.contacts[0]?.wa_id || '',
        };
      } else {
        throw new Error('No message ID returned from WhatsApp API');
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  async sendBulkMessages(recipients: Array<{ phoneNumber: string; messageText: string }>): Promise<Array<{ phoneNumber: string; messageId: string; waId: string; success: boolean; error?: string }>> {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendMessage(recipient.phoneNumber, recipient.messageText);
        results.push({
          phoneNumber: recipient.phoneNumber,
          messageId: result.messageId,
          waId: result.waId,
          success: true,
        });
      } catch (error) {
        results.push({
          phoneNumber: recipient.phoneNumber,
          messageId: '',
          waId: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, replace with country code (assuming India +91)
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    // If it doesn't start with country code, add +91 (India)
    if (!cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Basic validation - you might want to use a proper phone validation library
      return formattedPhone.length >= 12 && formattedPhone.length <= 15;
    } catch (error) {
      return false;
    }
  }
}

export const whatsappService = new WhatsAppService();