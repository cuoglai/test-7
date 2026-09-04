export type BookingStatus = 'deposited' | 'assigned' | 'completed' | 'paid' | 'cancelled';

export type PerformerType = 'owner' | 'ctv';

export type ReminderOption = 'none' | '15_mins' | '30_mins' | '1_hour' | '2_hours' | '3_hours' | '1_day';

export type CalendarMode = 'day' | 'week' | 'month';

export type ActiveTab = 'calendar' | 'bookings' | 'revenue' | 'settings';

export type ThemeMode = 'light' | 'dark';

export type AccentColor = 'blue' | 'purple' | 'pink' | 'orange' | 'green' | 'custom';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: number;
  updatedAt: number;
}

export interface MakeupPackage {
  id: string;
  name: string;
  defaultPrice: number;
  note?: string;
  active: boolean;
}

export interface CTV {
  id: string;
  name: string;
  phone: string;
  note?: string;
  active: boolean;
}

export interface Booking {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  quantity: number;
  
  // Verbatim makeup info (full note containing customer, service, financial info)
  makeupInfo?: string;
  
  // Package snapshot
  packageId?: string;
  packageNameSnapshot: string;
  packagePrice: number;
  
  // Financials
  price?: number;
  deposit: number;
  surcharge: number;
  totalAmount: number;
  remainingAmount: number;
  
  // Performer
  performerType: PerformerType;
  ctvId?: string;
  ctvNameSnapshot?: string;
  
  // Note & status
  note: string;
  reminder: ReminderOption;
  status: BookingStatus;
  
  createdAt: number;
  updatedAt: number;
}

export interface CTVConflict {
  conflictingBooking: Booking;
  overlapStart: string;
  overlapEnd: string;
}
