
export enum AppState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LIVE = 'LIVE',
  ERROR = 'ERROR'
}

export interface BookingData {
  pricePerNight: number;
  available: boolean;
  guestCount: number;
  discountApplied: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
}

export enum LiveConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}
