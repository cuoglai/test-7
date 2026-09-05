import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { Booking, BookingStatus, CTV } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyC9KWQVMIVkEv9umDuv0zWEasohszbqprw",
  authDomain: "makeup-manager-1e6ec.firebaseapp.com",
  projectId: "makeup-manager-1e6ec",
  storageBucket: "makeup-manager-1e6ec.firebasestorage.app",
  messagingSenderId: "835984302144",
  appId: "1:835984302144:web:5f5c00a6cc25b151f47fa5"
};

// Khởi tạo Firebase App an toàn
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection Names
export const BOOKINGS_COLLECTION = 'bookings';
export const CTVS_COLLECTION = 'ctvs';

// Helper: làm sạch dữ liệu trước khi gửi lên Firebase Firestore
// Firestore v9+ TUYỆT ĐỐI KHÔNG CHẤP NHẬN giá trị `undefined`
// Nếu có bất kỳ trường nào là undefined, setDoc/updateDoc sẽ lập tức ném lỗi và hủy toàn bộ thao tác lưu.
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizeForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// Helper: chuyển đổi doc Firestore sang đối tượng Booking chuẩn
export function docToBooking(id: string, data: Record<string, any>): Booking {
  return {
    id: id || data.id,
    customerId: data.customerId || undefined,
    customerName: data.customerName || 'Khách make',
    customerPhone: data.customerPhone || '',
    customerAddress: data.customerAddress || data.address || '',
    date: data.date || '',
    startTime: data.startTime || '08:00',
    endTime: data.endTime || '',
    quantity: typeof data.quantity === 'number' ? data.quantity : 1,
    makeupInfo: data.makeupInfo || '',
    packageId: data.packageId || undefined,
    packageNameSnapshot: data.packageNameSnapshot || data.serviceType || 'Gói Makeup',
    packagePrice: typeof data.packagePrice === 'number' ? data.packagePrice : (typeof data.totalAmount === 'number' ? data.totalAmount : 0),
    price: typeof data.price === 'number' ? data.price : (typeof data.totalAmount === 'number' ? data.totalAmount : 350000),
    deposit: typeof data.deposit === 'number' ? data.deposit : 0,
    surcharge: typeof data.surcharge === 'number' ? data.surcharge : 0,
    totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
    remainingAmount: typeof data.remainingAmount === 'number' ? data.remainingAmount : 0,
    performerType: data.performerType === 'ctv' ? 'ctv' : 'owner',
    ctvId: data.ctvId || undefined,
    ctvNameSnapshot: data.ctvNameSnapshot || data.ctvName || undefined,
    note: data.note || '',
    reminder: data.reminder || '30_mins',
    status: (data.status as BookingStatus) || 'deposited',
    createdAt: data.createdAt || Date.now(),
    updatedAt: data.updatedAt || Date.now()
  };
}

// Helper: chuyển đổi doc Firestore sang đối tượng CTV chuẩn
export function docToCTV(id: string, data: Record<string, any>): CTV {
  return {
    id: id || data.id,
    name: data.name || '',
    phone: data.phone || '',
    note: data.note || '',
    active: typeof data.active === 'boolean' ? data.active : true
  };
}

/**
 * Lắng nghe thay đổi dữ liệu thời gian thực (Realtime Listener) từ Firestore collection 'bookings'.
 * Dữ liệu hiển thị trên màn hình được lấy 100% từ kết quả trả về của Firestore.
 * Bất kỳ máy nào thêm/sửa/xóa thì tất cả máy khác đều tự động cập nhật ngay lập tức.
 */
export function subscribeToFirestoreBookings(
  onUpdate: (bookings: Booking[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, BOOKINGS_COLLECTION);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: Booking[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        // Bỏ qua nếu là document rác không có ngày và không có tên khách
        if (!data.date && !data.customerName && !data.makeupInfo) {
          console.warn(`[Firestore] Bỏ qua document không hợp lệ: id=${d.id}`);
          return;
        }
        list.push(docToBooking(d.id, data));
      });

      // Sắp xếp theo ngày và giờ bắt đầu
      list.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

      onUpdate(list);
    },
    (error) => {
      console.error('Lỗi khi lắng nghe Firestore bookings:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Lắng nghe thay đổi dữ liệu thời gian thực (Realtime Listener) từ Firestore collection 'ctvs'.
 * Dữ liệu CTV hiển thị 100% từ kết quả Firestore, không lưu riêng lẻ ở localStorage của từng máy.
 * Bất kỳ máy nào thêm/sửa/xóa CTV thì tất cả các máy khác đều tự động cập nhật ngay lập tức.
 */
export function subscribeToFirestoreCTVs(
  onUpdate: (ctvs: CTV[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, CTVS_COLLECTION);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: CTV[] = [];
      snapshot.forEach((d) => {
        list.push(docToCTV(d.id, d.data()));
      });

      // Sắp xếp CTV theo tên tiếng Việt
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));

      onUpdate(list);
    },
    (error) => {
      console.error('Lỗi khi lắng nghe Firestore ctvs:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Tạo / Sửa lịch makeup:
 * Lưu từng bản ghi độc lập: setDoc(doc(db, 'bookings', item.id), item, { merge: true })
 * CHỈ gọi setDoc cho đúng lịch đó, TUYỆT ĐỐI KHÔNG ghi đè toàn bộ collection.
 * Tự động làm sạch giá trị `undefined` để Firebase không bị lỗi.
 */
export async function saveBookingToFirestore(booking: Booking): Promise<void> {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, booking.id);
    const now = Date.now();
    const rawPayload: Record<string, any> = {
      id: booking.id,
      customerName: booking.customerName || 'Khách make',
      customerPhone: booking.customerPhone || '',
      customerAddress: booking.customerAddress || '',
      date: booking.date || '',
      startTime: booking.startTime || '08:00',
      endTime: booking.endTime || '',
      quantity: typeof booking.quantity === 'number' ? booking.quantity : 1,
      makeupInfo: booking.makeupInfo || '',
      packageNameSnapshot: booking.packageNameSnapshot || 'Gói Makeup',
      packagePrice: typeof booking.packagePrice === 'number' ? booking.packagePrice : 0,
      price: typeof booking.price === 'number' ? booking.price : (booking.totalAmount || 0),
      deposit: typeof booking.deposit === 'number' ? booking.deposit : 0,
      surcharge: typeof booking.surcharge === 'number' ? booking.surcharge : 0,
      totalAmount: typeof booking.totalAmount === 'number' ? booking.totalAmount : 0,
      remainingAmount: typeof booking.remainingAmount === 'number' ? booking.remainingAmount : 0,
      performerType: booking.performerType === 'ctv' ? 'ctv' : 'owner',
      note: booking.note || '',
      reminder: booking.reminder || '30_mins',
      status: booking.status || 'deposited',
      createdAt: booking.createdAt || now,
      updatedAt: now
    };

    if (booking.customerId) rawPayload.customerId = booking.customerId;
    if (booking.packageId) rawPayload.packageId = booking.packageId;
    if (booking.ctvId) rawPayload.ctvId = booking.ctvId;
    if (booking.ctvNameSnapshot) rawPayload.ctvNameSnapshot = booking.ctvNameSnapshot;

    const payload = sanitizeForFirestore(rawPayload);
    await setDoc(bookingRef, payload, { merge: true });
    console.log(`[Firestore] Đã lưu lịch ${booking.id} (${booking.customerName}) lên Cloud`);
  } catch (err) {
    console.error(`[Firestore] Lỗi khi lưu lịch ${booking.id} lên Cloud:`, err);
    throw err;
  }
}

export const addBookingToFirestore = saveBookingToFirestore;

export async function updateBookingInFirestore(
  id: string,
  updates: Partial<Booking>
): Promise<void> {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, id);
    const payload = sanitizeForFirestore({
      ...updates,
      updatedAt: Date.now()
    });
    await setDoc(bookingRef, payload, { merge: true });
    console.log(`[Firestore] Đã sửa lịch ${id} trên Cloud`);
  } catch (err) {
    console.error(`[Firestore] Lỗi khi sửa lịch ${id} trên Cloud:`, err);
    throw err;
  }
}

/**
 * Xóa lịch: CHỈ gọi deleteDoc cho đúng lịch bị xóa: deleteDoc(doc(db, 'bookings', item.id))
 */
export async function deleteBookingFromFirestore(id: string): Promise<void> {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, id);
    await deleteDoc(bookingRef);
    console.log(`[Firestore] Đã xóa lịch ${id} khỏi Cloud`);
  } catch (err) {
    console.error(`[Firestore] Lỗi khi xóa lịch ${id} khỏi Cloud:`, err);
    throw err;
  }
}

/**
 * Cập nhật trạng thái lịch makeup trên Firestore: CHỈ gọi setDoc với merge: true cho đúng Document ID
 */
export async function updateBookingStatusInFirestore(
  id: string,
  status: BookingStatus,
  extraUpdates: Partial<Booking> = {}
): Promise<void> {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, id);
    const updates: Record<string, any> = {
      status,
      updatedAt: Date.now(),
      ...extraUpdates
    };
    if (status === 'paid' && extraUpdates.remainingAmount === undefined) {
      updates.remainingAmount = 0;
    }
    const payload = sanitizeForFirestore(updates);
    await setDoc(bookingRef, payload, { merge: true });
    console.log(`[Firestore] Đã cập nhật trạng thái lịch ${id} -> ${status} trên Cloud`);
  } catch (err) {
    console.error(`[Firestore] Lỗi khi cập nhật trạng thái lịch ${id} trên Cloud:`, err);
    throw err;
  }
}

/**
 * Tạo / Sửa thông tin Cộng tác viên (CTV):
 * Lưu từng bản ghi độc lập: setDoc(doc(db, 'ctvs', item.id), item, { merge: true })
 * CHỈ gọi setDoc cho đúng Document tương ứng lên collection 'ctvs'.
 */
export async function saveCTVToFirestore(ctv: CTV): Promise<void> {
  try {
    const ctvRef = doc(db, CTVS_COLLECTION, ctv.id);
    const rawPayload: Record<string, any> = {
      id: ctv.id,
      name: ctv.name,
      phone: ctv.phone || '',
      note: ctv.note || '',
      active: typeof ctv.active === 'boolean' ? ctv.active : true,
      updatedAt: Date.now()
    };
    const payload = sanitizeForFirestore(rawPayload);
    await setDoc(ctvRef, payload, { merge: true });
    console.log(`[Firestore] Đã lưu CTV ${ctv.id} (${ctv.name}) lên Cloud`);
  } catch (err) {
    console.error(`[Firestore] Lỗi khi lưu CTV ${ctv.id} lên Cloud:`, err);
    throw err;
  }
}

/**
 * Xóa CTV: CHỈ gọi deleteDoc cho đúng Document ID trong collection 'ctvs'
 */
export async function deleteCTVFromFirestore(id: string): Promise<void> {
  try {
    const ctvRef = doc(db, CTVS_COLLECTION, id);
    await deleteDoc(ctvRef);
    console.log(`[Firestore] Đã xóa CTV ${id} khỏi Cloud`);
  } catch (err) {
    console.error(`[Firestore] Lỗi khi xóa CTV ${id} khỏi Cloud:`, err);
    throw err;
  }
}

/**
 * Kiểm tra kết nối tới Firestore
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const colRef = collection(db, BOOKINGS_COLLECTION);
    await getDocs(colRef);
    return true;
  } catch (err) {
    console.error('Kiểm tra kết nối Firestore thất bại:', err);
    return false;
  }
}
