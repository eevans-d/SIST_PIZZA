/**
 * GDPR & Ley 25.326 (Argentina) Compliance Configuration
 * Data Protection and Privacy Requirements
 */

export interface ComplianceConfig {
  // Data retention policies
  dataRetention: {
    userProfiles: number; // days
    orderHistory: number;
    supportTickets: number;
    auditLogs: number;
    analyticsData: number;
  };

  // Data sensitivity levels
  sensitivityLevels: {
    public: string[];
    internal: string[];
    confidential: string[];
    restricted: string[];
  };

  // PII (Personally Identifiable Information)
  piiFields: string[];

  // Data processing agreements
  dpa: {
    vendor: string;
    dataProcessor: string;
    purposes: string[];
    retention: string;
  };
}

export const complianceConfig: ComplianceConfig = {
  dataRetention: {
    userProfiles: 365 * 3, // 3 years per Ley 25.326
    orderHistory: 365 * 2, // 2 years
    supportTickets: 365 * 1, // 1 year
    auditLogs: 365 * 7, // 7 years (legal requirement)
    analyticsData: 365 * 1, // 1 year
  },

  sensitivityLevels: {
    public: ['product_name', 'menu_item', 'zone'],
    internal: ['employee_id', 'shift_schedule'],
    confidential: ['customer_phone', 'customer_email', 'order_details'],
    restricted: ['payment_method', 'dni', 'customer_address'],
  },

  piiFields: [
    'dni', // Documento Nacional de Identidad
    'customer_phone',
    'customer_email',
    'customer_address',
    'customer_name',
    'payment_method',
    'bank_account',
    'ip_address',
    'user_agent',
  ],

  dpa: {
    vendor: 'Supabase',
    dataProcessor: 'Supabase (PostgreSQL)',
    purposes: [
      'Order processing',
      'Payment processing',
      'Customer support',
      'Analytics',
      'Fraud prevention',
    ],
    retention: '3 years per Ley 25.326',
  },
};

/**
 * Data protection standards
 */
export class DataProtectionStandards {
  // Encryption requirements
  static ENCRYPTION_ALGORITHM = 'AES-256';
  static HASH_ALGORITHM = 'bcrypt';
  static HASH_ROUNDS = 12;

  // Access control
  static MAX_LOGIN_ATTEMPTS = 5;
  static LOCKOUT_DURATION_MINUTES = 30;
  static SESSION_TIMEOUT_MINUTES = 60;

  // Data minimization
  static COLLECT_ONLY_NECESSARY = true;
  static PURPOSE_LIMITATION = true;
  static STORAGE_LIMITATION = true;

  // Audit requirements
  static AUDIT_LOG_RETENTION_DAYS = 365 * 7; // 7 years
  static LOG_ALL_DATA_ACCESS = true;
  static LOG_ALL_DATA_MODIFICATIONS = true;
}

/**
 * User rights under GDPR/Ley 25.326
 */
export enum UserRight {
  // Right to access their data
  ACCESS = 'data_access',

  // Right to have data corrected
  RECTIFICATION = 'data_rectification',

  // Right to be forgotten
  DELETION = 'data_deletion',

  // Right to restrict processing
  RESTRICTION = 'data_restriction',

  // Right to data portability
  PORTABILITY = 'data_portability',

  // Right to object
  OBJECTION = 'data_objection',

  // Right to withdraw consent
  WITHDRAW_CONSENT = 'withdraw_consent',
}

/**
 * Data processing categories
 */
export enum DataProcessingCategory {
  // Legal basis
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests',

  // Purpose
  ORDER_FULFILLMENT = 'order_fulfillment',
  PAYMENT_PROCESSING = 'payment_processing',
  CUSTOMER_SUPPORT = 'customer_support',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  SECURITY = 'security',
}

/**
 * Incident response requirements
 */
export interface DataBreachIncident {
  id: string;
  date: Date;
  description: string;
  affectedUsers: number;
  affectedDataTypes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  reported: boolean;
  reportedToAuthority: boolean; // AEPD in Spain, AAIP in Argentina
  reportDate: Date | null;
  resolution: string;
}

/**
 * Consent management
 */
export interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'cookies' | 'data_processing';
  given: boolean;
  givenAt: Date;
  version: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Data export format for user portability
 */
export interface DataPortabilityExport {
  userData: {
    id: string;
    email: string;
    phone: string;
    orders: any[];
    supportTickets: any[];
  };
  exportDate: Date;
  format: 'json' | 'csv';
  signed: boolean;
}

/**
 * Compliance validation functions
 */
export class ComplianceValidator {
  /**
   * Validate that PII is properly redacted in logs
   */
  static validatePIIRedaction(data: any): boolean {
    const piiFields = complianceConfig.piiFields;
    const dataStr = JSON.stringify(data);

    for (const field of piiFields) {
      if (dataStr.includes(field) && !dataStr.includes('[REDACTED]')) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate encryption standards
   */
  static validateEncryption(
    algorithm: string,
    keyLength: number
  ): boolean {
    return (
      algorithm === DataProtectionStandards.ENCRYPTION_ALGORITHM &&
      keyLength >= 256
    );
  }

  /**
   * Validate data retention compliance
   */
  static isDataRetentionExpired(
    dataType: keyof typeof complianceConfig.dataRetention,
    createdAt: Date
  ): boolean {
    const retentionDays =
      complianceConfig.dataRetention[dataType];
    const expirationDate = new Date(createdAt);
    expirationDate.setDate(expirationDate.getDate() + retentionDays);

    return new Date() > expirationDate;
  }

  /**
   * Validate user consent
   */
  static validateConsent(
    consent: ConsentRecord,
    _requiredFor: DataProcessingCategory
  ): boolean {
    return consent.given && consent.givenAt < new Date();
  }
}

export default {
  complianceConfig,
  DataProtectionStandards,
  UserRight,
  DataProcessingCategory,
  ComplianceValidator,
};
