import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

// Logger simple para compliance service
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err),
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Compliance Service - GDPR/Ley 25.326 Enforcement
 */
export class ComplianceService {
  /**
   * Log data access for audit trail
   */
  static async logDataAccess(
    userId: string,
    dataType: string,
    fields: string[],
    ipAddress: string
  ) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'DATA_ACCESS',
        data_type: dataType,
        fields_accessed: fields,
        ip_address: ipAddress,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error logging data access', error);
    }
  }

  /**
   * Redact PII from logs and responses
   */
  static redactPII(data: any, piiFields: string[] = []): any {
    if (!data) return data;

    const defaultPIIFields = [
      'dni',
      'customer_phone',
      'customer_email',
      'customer_address',
      'customer_name',
      'payment_method',
      'bank_account',
    ];

    const fieldsToRedact = [...defaultPIIFields, ...piiFields];
    const redacted = JSON.parse(JSON.stringify(data));

    const redactObject = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const key in obj) {
        if (fieldsToRedact.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          redactObject(obj[key]);
        }
      }
    };

    redactObject(redacted);
    return redacted;
  }

  /**
   * Hash sensitive data
   */
  static async hashData(data: string): Promise<string> {
    try {
      return await bcrypt.hash(data, 12);
    } catch (error) {
      logger.error('Error hashing data', error);
      throw error;
    }
  }

  /**
   * Export user data (Right to Portability)
   */
  static async exportUserData(userId: string): Promise<any> {
    try {
      const [user, orders, tickets] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('comandas').select('*').eq('user_id', userId),
        supabase.from('support_tickets').select('*').eq('user_id', userId),
      ]);

      return {
        user: user.data,
        orders: orders.data,
        supportTickets: tickets.data,
        exportDate: new Date(),
        format: 'json',
      };
    } catch (error) {
      logger.error('Error exporting user data', error);
      throw error;
    }
  }

  /**
   * Delete user data (Right to be Forgotten)
   */
  static async deleteUserData(userId: string): Promise<void> {
    try {
      // Start transaction
      const { data: pendingOrders } = await supabase
        .from('comandas')
        .select('id')
        .eq('user_id', userId)
        .neq('status', 'completed');

      if (pendingOrders && pendingOrders.length > 0) {
        throw new Error('Cannot delete user with pending orders');
      }

      // Anonymize user data
      await supabase
        .from('profiles')
        .update({
          name: 'DELETED_USER',
          email: `deleted_${userId}@example.com`,
          phone: null,
          address: null,
        })
        .eq('id', userId);

      // Delete sensitive data
      await supabase.from('payment_methods').delete().eq('user_id', userId);

      // Log deletion
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'DATA_DELETION_REQUESTED',
        timestamp: new Date(),
      });

      logger.info(`User ${userId} data deleted per GDPR request`);
    } catch (error) {
      logger.error('Error deleting user data', error);
      throw error;
    }
  }

  /**
   * Update user data (Right to Rectification)
   */
  static async updateUserData(
    userId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      // Log the change
      const before = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      await supabase.from('profiles').update(updates).eq('id', userId);

      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'DATA_RECTIFICATION',
        before: before.data,
        after: updates,
        timestamp: new Date(),
      });

      logger.info(`User ${userId} data updated`);
    } catch (error) {
      logger.error('Error updating user data', error);
      throw error;
    }
  }

  /**
   * Check and enforce data retention policies
   */
  static async enforceRetentionPolicy(): Promise<void> {
    try {
      const retentionDays = {
        orderHistory: 365 * 2,
        supportTickets: 365,
        analyticsData: 365,
        auditLogs: 365 * 7,
      };

      // Delete old orders
      const orderExpiry = new Date();
      orderExpiry.setDate(orderExpiry.getDate() - retentionDays.orderHistory);
      await supabase
        .from('comandas')
        .delete()
        .lt('created_at', orderExpiry.toISOString())
        .eq('status', 'completed');

      // Delete old support tickets
      const ticketExpiry = new Date();
      ticketExpiry.setDate(
        ticketExpiry.getDate() - retentionDays.supportTickets
      );
      await supabase
        .from('support_tickets')
        .delete()
        .lt('created_at', ticketExpiry.toISOString())
        .eq('resolved', true);

      logger.info('Data retention policy enforced');
    } catch (error) {
      logger.error('Error enforcing retention policy', error);
    }
  }

  /**
   * Log consent record
   */
  static async logConsent(
    userId: string,
    consentType: string,
    given: boolean,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      await supabase.from('consent_records').insert({
        user_id: userId,
        consent_type: consentType,
        given,
        given_at: new Date(),
        ip_address: ipAddress,
        user_agent: userAgent,
        version: '1.0',
      });
    } catch (error) {
      logger.error('Error logging consent', error);
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const auditLogs = await supabase
        .from('audit_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      const deletionRequests = auditLogs.data?.filter(
        (log) => log.action === 'DATA_DELETION_REQUESTED'
      ) || [];

      const accessLog = auditLogs.data?.filter(
        (log) => log.action === 'DATA_ACCESS'
      ) || [];

      return {
        period: { startDate, endDate },
        totalAuditLogs: auditLogs.data?.length || 0,
        deletionRequests: deletionRequests.length,
        dataAccessEvents: accessLog.length,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error generating compliance report', error);
      throw error;
    }
  }

  /**
   * Check if user has valid consent
   */
  static async hasValidConsent(
    userId: string,
    consentType: string
  ): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .eq('given', true)
        .order('given_at', { ascending: false })
        .limit(1);

      return !!(data && data.length > 0);
    } catch (error) {
      logger.error('Error checking consent', error);
      return false;
    }
  }

  /**
   * Respond to data subject request
   */
  static async handleDataSubjectRequest(
    userId: string,
    requestType: 'access' | 'rectification' | 'deletion' | 'portability'
  ): Promise<any> {
    try {
      // Log request
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: `DATA_SUBJECT_REQUEST_${requestType.toUpperCase()}`,
        timestamp: new Date(),
      });

      switch (requestType) {
        case 'access':
          return await this.exportUserData(userId);
        case 'portability':
          return await this.exportUserData(userId);
        case 'deletion':
          await this.deleteUserData(userId);
          return { status: 'completed' };
        default:
          throw new Error(`Unknown request type: ${requestType}`);
      }
    } catch (error) {
      logger.error(`Error handling ${requestType} request`, error);
      throw error;
    }
  }
}

export default ComplianceService;
