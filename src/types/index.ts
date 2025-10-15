// =============================================================================
// Core Entity Types (Database Schema)
// =============================================================================

export interface Building {
  id: string;
  name: string;
  address: string;
  timezone: string;
  temperature_unit: 'celsius' | 'fahrenheit';
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  building_id: string;
  name: string;
  floor: number;
  max_occupancy: number;
  zone_type: string;
  area_sqm?: number;
  created_at: string;
  updated_at: string;
}

export interface SensorType {
  id: number;
  type_name: 'PM2.5' | 'CO2' | 'TVOC' | 'Temperature' | 'Humidity' | 'Pressure';
  unit: string;
  description?: string;
  good_threshold: number;
  moderate_threshold: number;
  poor_threshold: number;
  critical_threshold: number;
  created_at: string;
}

export interface Sensor {
  id: string;
  zone_id: string;
  sensor_type_id: number;
  sensor_identifier: string;
  manufacturer?: string;
  model?: string;
  installation_date?: string;
  last_calibrated?: string;
  calibration_offset: number;
  accuracy_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
  permissions: string[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Time-Series Data Types (Hypertables)
// =============================================================================

export interface SensorReading {
  time: string;
  sensor_id: string;
  value: number;
  status: 'good' | 'moderate' | 'poor' | 'critical';
  raw_value?: number;
  quality_score: number;
}

export interface OccupancyLog {
  time: string;
  zone_id: string;
  occupancy_count: number;
  max_occupancy: number;
  occupancy_percentage: number;
  detection_method: string;
}

export interface Alert {
  time: string;
  id: string;
  zone_id: string;
  sensor_id: string;
  alert_type: string;
  sensor_type: string;
  value?: number;
  status: 'good' | 'moderate' | 'poor' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

export interface AuditLog {
  time: string;
  id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
}

// =============================================================================
// Application Feature Types
// =============================================================================

export interface AIReport {
  id: string;
  building_id: string;
  report_type: 'daily' | 'weekly' | 'monthly';
  title?: string;
  content: string;
  summary?: {
    overallScore: number;
    keyFindings: string[];
    recommendations: string[];
    energyEfficiency: number;
  };
  zone_ids: string[];
  data_period_start: string;
  data_period_end: string;
  generated_by: string;
  generation_duration_ms?: number;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  building_id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    context?: {
      zone_id?: string;
      alert_id?: string;
      sensor_type?: string;
      action_taken?: string;
    };
    openai_metadata?: {
      model: string;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
  };
  tokens_used?: number;
  response_time_ms?: number;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  context?: {
    zone_id?: string;
    alert_id?: string;
    sensor_type?: string;
    current_page?: string;
  };
}

export interface ChatResponse {
  message_id: string;
  conversation_id: string;
  response: string;
  metadata?: any;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  refresh_token_hash?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  created_at: string;
  last_used_at: string;
  is_active: boolean;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: Omit<User, 'password_hash'>;
  expiresIn: string;
}

export interface SensorReadingResponse {
  id: string;
  type: 'PM2.5' | 'CO2' | 'TVOC' | 'Temperature' | 'Humidity' | 'Pressure';
  value: number;
  unit: string;
  timestamp: string;
  status: 'good' | 'moderate' | 'poor' | 'critical';
  threshold: {
    good: number;
    moderate: number;
    poor: number;
    critical: number;
  };
}

export interface ZoneResponse {
  id: string;
  name: string;
  floor: number;
  readings: SensorReadingResponse[];
  occupancy: number;
  maxOccupancy: number;
  lastUpdated: string;
}

export interface BuildingDataResponse {
  id: string;
  name: string;
  zones: ZoneResponse[];
  overallAirQuality: 'good' | 'moderate' | 'poor' | 'critical';
  lastUpdated: string;
  address: string;
}

export interface AlertNotificationResponse {
  id: string;
  zoneId: string;
  zoneName: string;
  sensorType:
    | 'PM2.5'
    | 'CO2'
    | 'TVOC'
    | 'Temperature'
    | 'Humidity'
    | 'Pressure';
  value: number;
  unit: string;
  status: 'good' | 'moderate' | 'poor' | 'critical';
  timestamp: string;
  isRead: boolean;
}

export interface BuildingOverviewResponse {
  totalZones: number;
  statusCounts: {
    good: number;
    moderate: number;
    poor: number;
    critical: number;
  };
  averageReadings: {
    [sensorType: string]: {
      value: number;
      unit: string;
      status: string;
    };
  };
}

export interface HistoricalDataResponse {
  sensorType: string;
  unit: string;
  data: {
    timestamp: string;
    value: number;
  }[];
  thresholds: {
    good: number;
    moderate: number;
    poor: number;
    critical: number;
  };
}

export interface TrendsResponse {
  period: string;
  data: {
    timestamp: string;
    values: {
      [sensorType: string]: number;
    };
  }[];
  summary: {
    [sensorType: string]: {
      average: number;
      min: number;
      max: number;
      trend: 'improving' | 'stable' | 'deteriorating';
    };
  };
}

// =============================================================================
// Settings and Configuration Types
// =============================================================================

export interface BuildingSettings {
  building_id: string;
  notification_email?: string;
  emergency_contact?: string;
  operating_hours?: {
    start: string;
    end: string;
    days: string[];
  };
  alert_thresholds?: Record<string, any>;
  automated_responses?: Record<string, any>;
  maintenance_schedule?: Record<string, any>;
  energy_settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserNotificationSettings {
  user_id: string;
  notifications_enabled: boolean;
  sound_alerts_enabled: boolean;
  priority_filter: 'critical' | 'poor' | 'all';
  email_notifications: boolean;
  push_notifications: boolean;
  notification_schedule?: Record<string, any>;
  alert_types: string[];
  created_at: string;
  updated_at: string;
}

// =============================================================================
// WebSocket Event Types
// =============================================================================

export interface WebSocketEvent {
  type:
    | 'sensor_reading'
    | 'occupancy_update'
    | 'alert_new'
    | 'alert_resolved'
    | 'system_status';
  data: any;
  timestamp: string;
}

export interface SensorUpdateEvent {
  zoneId: string;
  reading: SensorReadingResponse;
}

export interface OccupancyUpdateEvent {
  zoneId: string;
  occupancy: number;
  maxOccupancy: number;
  timestamp: string;
}

export interface AlertEvent {
  alert: AlertNotificationResponse;
}

// =============================================================================
// Utility Types
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  sensorType?: string;
  zoneId?: string;
  buildingId?: string;
  floor?: number;
}

export interface QueryParams extends PaginationParams, FilterParams {
  search?: string;
  floor?: number;
}

// =============================================================================
// Validation Schemas Types
// =============================================================================

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: 'admin' | 'manager' | 'viewer';
  is_active?: boolean;
}

export interface CreateBuildingRequest {
  name: string;
  address: string;
  timezone?: string;
  temperature_unit?: 'celsius' | 'fahrenheit';
  contact_email?: string;
  contact_phone?: string;
}

export interface CreateZoneRequest {
  building_id: string;
  name: string;
  floor: number;
  max_occupancy?: number;
  zone_type?: string;
  area_sqm?: number;
}

export interface CreateSensorRequest {
  zone_id: string;
  sensor_type_id: number;
  sensor_identifier: string;
  manufacturer?: string;
  model?: string;
  installation_date?: string;
}

export interface SensorReadingInput {
  sensor_id: string;
  value: number;
  timestamp?: string;
  raw_value?: number;
  quality_score?: number;
}

// =============================================================================
// Extended Types for Complex Operations
// =============================================================================

export interface ZoneWithSensors extends Zone {
  sensors: (Sensor & { sensor_type: SensorType })[];
  latest_readings: SensorReading[];
  latest_occupancy?: OccupancyLog;
}

export interface BuildingWithZones extends Building {
  zones: ZoneWithSensors[];
  total_zones: number;
  active_alerts: number;
}

export interface SensorWithType extends Sensor {
  sensor_type: SensorType;
  zone: Zone;
}

export interface UserProfile extends Omit<User, 'password_hash'> {
  notification_settings?: UserNotificationSettings;
  recent_sessions: UserSession[];
}

// =============================================================================
// Database Connection Types
// =============================================================================

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableOfflineQueue?: boolean;
}

// =============================================================================
// Service Layer Types
// =============================================================================

export interface DatabaseService {
  query<T = any>(text: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface CacheService {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
}

export interface NotificationService {
  sendEmail(to: string, subject: string, content: string): Promise<void>;
  sendAlert(alert: Alert): Promise<void>;
  sendBulkNotifications(notifications: any[]): Promise<void>;
}
