import { Booking, CTV, MakeupPackage, Customer, ReminderOption, BookingStatus, ThemeMode, AccentColor } from '../types';
import { INITIAL_BOOKINGS, INITIAL_CTVS, INITIAL_PACKAGES, INITIAL_CUSTOMERS } from '../data/demoData';

const STORAGE_KEYS = {
  BOOKINGS: 'makeup_manager_bookings_v1',
  CTVS: 'makeup_manager_ctvs_v1',
  PACKAGES: 'makeup_manager_packages_v1',
  CUSTOMERS: 'makeup_manager_customers_v1',
  DEFAULT_REMINDER: 'makeup_manager_default_reminder_v1',
  THEME: 'makeup_manager_theme_mode_v1',
  ACCENT_COLOR: 'makeup_manager_accent_color_v1',
  CUSTOM_ACCENT_HEX: 'makeup_manager_custom_accent_hex_v1',
  LAST_BACKUP_TIME: 'makeup_manager_last_backup_time_v1'
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    window.dispatchEvent(new Event('makeup_storage_change'));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage`, err);
  }
}

// Initializer
export function initStorage(): void {
  if (!localStorage.getItem(STORAGE_KEYS.PACKAGES)) {
    safeSet(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    safeSet(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
    safeSet(STORAGE_KEYS.BOOKINGS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DEFAULT_REMINDER)) {
    safeSet<ReminderOption>(STORAGE_KEYS.DEFAULT_REMINDER, '30_mins');
  }
}

// Bookings
export function getCachedBookings(): Booking[] {
  initStorage();
  const list = safeGet<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });
}

export function cacheBookingsLocally(list: Booking[]): void {
  safeSet(STORAGE_KEYS.BOOKINGS, list);
}

export function getBookings(): Booking[] {
  return getCachedBookings();
}

export function saveBooking(booking: Booking): Booking {
  const list = getBookings();
  const existingIdx = list.findIndex(b => b.id === booking.id);
  const now = Date.now();

  let updated: Booking;
  if (existingIdx >= 0) {
    updated = { ...booking, updatedAt: now };
    list[existingIdx] = updated;
  } else {
    updated = { ...booking, createdAt: booking.createdAt || now, updatedAt: now };
    list.push(updated);
  }

  safeSet(STORAGE_KEYS.BOOKINGS, list);

  // Also auto-sync/upsert customer
  if (booking.customerPhone && booking.customerName) {
    upsertCustomerFromBooking(booking);
  }

  return updated;
}

export function deleteBooking(id: string): void {
  const list = getBookings().filter(b => b.id !== id);
  safeSet(STORAGE_KEYS.BOOKINGS, list);
}

export function updateBookingStatus(id: string, status: BookingStatus): void {
  const list = getBookings();
  const target = list.find(b => b.id === id);
  if (target) {
    target.status = status;
    // If marked paid, adjust remaining amount
    if (status === 'paid' && target.remainingAmount > 0) {
      target.deposit = target.totalAmount;
      target.remainingAmount = 0;
    }
    target.updatedAt = Date.now();
    safeSet(STORAGE_KEYS.BOOKINGS, list);
  }
}

export function saveBookingsBatch(bookings: Booking[]): void {
  safeSet(STORAGE_KEYS.BOOKINGS, bookings);
}

// Packages
export function getPackages(): MakeupPackage[] {
  initStorage();
  return safeGet<MakeupPackage[]>(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
}

export function savePackage(pkg: MakeupPackage): void {
  const list = getPackages();
  const idx = list.findIndex(p => p.id === pkg.id);
  if (idx >= 0) {
    list[idx] = pkg;
  } else {
    list.push(pkg);
  }
  safeSet(STORAGE_KEYS.PACKAGES, list);
}

export function deletePackage(id: string): void {
  const list = getPackages().filter(p => p.id !== id);
  safeSet(STORAGE_KEYS.PACKAGES, list);
}

// CTVs
export function getCTVs(): CTV[] {
  initStorage();
  return safeGet<CTV[]>(STORAGE_KEYS.CTVS, INITIAL_CTVS);
}

export function saveCTV(ctv: CTV): void {
  const list = getCTVs();
  const idx = list.findIndex(c => c.id === ctv.id);
  if (idx >= 0) {
    list[idx] = ctv;
  } else {
    list.push(ctv);
  }
  safeSet(STORAGE_KEYS.CTVS, list);
}

export function deleteCTV(id: string): void {
  const list = getCTVs().filter(c => c.id !== id);
  safeSet(STORAGE_KEYS.CTVS, list);
}

// Customers
export function getCustomers(): Customer[] {
  initStorage();
  return safeGet<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
}

export function findCustomerByPhone(phone: string): Customer | undefined {
  if (!phone || phone.trim().length < 4) return undefined;
  const cleanPhone = phone.replace(/\s+/g, '');
  const customers = getCustomers();
  return customers.find(c => c.phone.replace(/\s+/g, '') === cleanPhone);
}

export function upsertCustomerFromBooking(booking: Booking): void {
  const customers = getCustomers();
  const cleanPhone = booking.customerPhone.replace(/\s+/g, '');
  const existing = customers.find(c => c.phone.replace(/\s+/g, '') === cleanPhone);
  const now = Date.now();

  if (existing) {
    existing.name = booking.customerName || existing.name;
    existing.address = booking.customerAddress || existing.address;
    existing.updatedAt = now;
  } else {
    customers.push({
      id: 'cust-' + Math.random().toString(36).substring(2, 9),
      name: booking.customerName,
      phone: booking.customerPhone,
      address: booking.customerAddress,
      createdAt: now,
      updatedAt: now
    });
  }
  safeSet(STORAGE_KEYS.CUSTOMERS, customers);
}

// Settings
export function getDefaultReminder(): ReminderOption {
  initStorage();
  return safeGet<ReminderOption>(STORAGE_KEYS.DEFAULT_REMINDER, '3_hours');
}

export function setDefaultReminder(option: ReminderOption): void {
  safeSet(STORAGE_KEYS.DEFAULT_REMINDER, option);
}

export function getThemeMode(): ThemeMode {
  initStorage();
  return safeGet<ThemeMode>(STORAGE_KEYS.THEME, 'light');
}

export function setThemeMode(theme: ThemeMode): void {
  safeSet(STORAGE_KEYS.THEME, theme);
}

export function getAccentColor(): AccentColor {
  initStorage();
  return safeGet<AccentColor>(STORAGE_KEYS.ACCENT_COLOR, 'blue');
}

export function setAccentColor(color: AccentColor): void {
  safeSet(STORAGE_KEYS.ACCENT_COLOR, color);
}

export function getCustomAccentHex(): string {
  initStorage();
  return safeGet<string>(STORAGE_KEYS.CUSTOM_ACCENT_HEX, '#FF2D55');
}

export function setCustomAccentHex(hex: string): void {
  safeSet(STORAGE_KEYS.CUSTOM_ACCENT_HEX, hex);
}

export function getLastBackupTime(): number | null {
  const t = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_TIME);
  return t ? Number(t) : null;
}

export function setLastBackupTime(timestamp: number): void {
  localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_TIME, String(timestamp));
}

// Backup & Sync Interface
export interface BackupData {
  version: number;
  appName: string;
  exportDate: string;
  timestamp: number;
  data: {
    bookings: Booking[];
    ctvs: CTV[];
    packages: MakeupPackage[];
    customers: Customer[];
    defaultReminder?: ReminderOption;
    accentColor?: AccentColor;
    themeMode?: ThemeMode;
    customAccentHex?: string;
  };
}

export function createBackupPayload(): BackupData {
  initStorage();
  const now = Date.now();
  const dateStr = new Date(now).toISOString().split('T')[0];
  const payload: BackupData = {
    version: 1,
    appName: 'Ynii Makeup Manager',
    exportDate: dateStr,
    timestamp: now,
    data: {
      bookings: safeGet<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
      ctvs: safeGet<CTV[]>(STORAGE_KEYS.CTVS, []),
      packages: safeGet<MakeupPackage[]>(STORAGE_KEYS.PACKAGES, []),
      customers: safeGet<Customer[]>(STORAGE_KEYS.CUSTOMERS, []),
      defaultReminder: safeGet<ReminderOption>(STORAGE_KEYS.DEFAULT_REMINDER, '3_hours'),
      accentColor: safeGet<AccentColor>(STORAGE_KEYS.ACCENT_COLOR, 'blue'),
      themeMode: safeGet<ThemeMode>(STORAGE_KEYS.THEME, 'light'),
      customAccentHex: safeGet<string>(STORAGE_KEYS.CUSTOM_ACCENT_HEX, '#FF2D55')
    }
  };
  setLastBackupTime(now);
  return payload;
}

export function restoreFromBackup(
  backup: BackupData,
  mode: 'overwrite' | 'merge' = 'overwrite'
): { bookingsCount: number; ctvsCount: number; customersCount: number } {
  if (!backup || !backup.data) {
    throw new Error('Tệp sao lưu không hợp lệ hoặc thiếu dữ liệu.');
  }

  const { bookings = [], ctvs = [], packages = [], customers = [], defaultReminder, accentColor, themeMode, customAccentHex } = backup.data;

  if (mode === 'overwrite') {
    safeSet(STORAGE_KEYS.BOOKINGS, bookings);
    safeSet(STORAGE_KEYS.CTVS, ctvs);
    if (packages.length > 0) safeSet(STORAGE_KEYS.PACKAGES, packages);
    if (customers.length > 0) safeSet(STORAGE_KEYS.CUSTOMERS, customers);
    if (defaultReminder) safeSet(STORAGE_KEYS.DEFAULT_REMINDER, defaultReminder);
    if (accentColor) safeSet(STORAGE_KEYS.ACCENT_COLOR, accentColor);
    if (themeMode) safeSet(STORAGE_KEYS.THEME, themeMode);
    if (customAccentHex) safeSet(STORAGE_KEYS.CUSTOM_ACCENT_HEX, customAccentHex);
  } else {
    // Mode 'merge': Giữ dữ liệu hiện tại, bổ sung các mục mới hoặc cập nhật theo id
    const currentBookings = safeGet<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const mergedBookings = [...currentBookings];
    for (const b of bookings) {
      const idx = mergedBookings.findIndex((item) => item.id === b.id);
      if (idx >= 0) {
        mergedBookings[idx] = b;
      } else {
        mergedBookings.push(b);
      }
    }
    safeSet(STORAGE_KEYS.BOOKINGS, mergedBookings);

    const currentCTVs = safeGet<CTV[]>(STORAGE_KEYS.CTVS, []);
    const mergedCTVs = [...currentCTVs];
    for (const c of ctvs) {
      const idx = mergedCTVs.findIndex((item) => item.id === c.id);
      if (idx >= 0) {
        mergedCTVs[idx] = c;
      } else {
        mergedCTVs.push(c);
      }
    }
    safeSet(STORAGE_KEYS.CTVS, mergedCTVs);

    const currentCustomers = safeGet<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const mergedCustomers = [...currentCustomers];
    for (const cust of customers) {
      const idx = mergedCustomers.findIndex((item) => item.id === cust.id);
      if (idx >= 0) {
        mergedCustomers[idx] = cust;
      } else {
        mergedCustomers.push(cust);
      }
    }
    safeSet(STORAGE_KEYS.CUSTOMERS, mergedCustomers);
  }

  setLastBackupTime(Date.now());

  return {
    bookingsCount: bookings.length,
    ctvsCount: ctvs.length,
    customersCount: customers.length
  };
}

export function exportBackupFile(): void {
  const payload = createBackupPayload();
  const dateStr = new Date().toISOString().split('T')[0];
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ynii_makeup_backup_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateSyncCode(): string {
  const payload = createBackupPayload();
  const jsonStr = JSON.stringify(payload);
  // Mã hóa Base64 an toàn cho Unicode tiếng Việt
  const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  return 'YNII_' + btoa(utf8Bytes);
}

export function parseSyncCode(code: string): BackupData {
  const cleanCode = code.trim();
  const base64Str = cleanCode.startsWith('YNII_') ? cleanCode.replace('YNII_', '') : cleanCode;
  const decodedBytes = atob(base64Str);
  const jsonStr = decodeURIComponent(
    Array.from(decodedBytes)
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonStr) as BackupData;
}

export function resetDemoData(): void {
  safeSet(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
  safeSet(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
  safeSet(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  safeSet(STORAGE_KEYS.DEFAULT_REMINDER, '3_hours');
}
