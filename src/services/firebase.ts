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

// Helper: chuyển đổi doc Firestore sang đối tượng Booking chuẩn
export function docToBooking(id: string, data: Record<string, any>): Booking {
  return {
    id: id || data.id,
    customerId: data.customerId || undefined,
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    customerAddress: data.customerAddress || data.address || '',
    date: data.date || '',
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    quantity: typeof data.quantity === 'number' ? data.quantity : 1,
    makeupInfo: data.makeupInfo || '',
    packageId: data.packageId || undefined,
    packageNameSnapshot: data.packageNameSnapshot || data.serviceType || 'Gói Makeup',
    packagePrice: typeof data.packagePrice === 'number' ? data.packagePrice : (typeof data.totalAmount === 'number' ? data.totalAmount : 0),
    price: typeof data.price === 'number' ? data.price : undefined,
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
 */
export async function saveBookingToFirestore(booking: Booking): Promise<void> {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, booking.id);
    const now = Date.now();
    const payload = {
      ...booking,
      createdAt: booking.createdAt || now,
      updatedAt: now
    };
    await setDoc(bookingRef, payload, { merge: true });
  } catch (err) {
    console.error(`Lỗi khi lưu lịch ${booking.id} lên Firestore:`, err);
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
    const payload = {
      ...updates,
      updatedAt: Date.now()
    };
    await setDoc(bookingRef, payload, { merge: true });
  } catch (err) {
    console.error(`Lỗi khi sửa lịch ${id} trên Firestore:`, err);
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
  } catch (err) {
    console.error(`Lỗi khi xóa lịch ${id} khỏi Firestore:`, err);
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
    await setDoc(bookingRef, updates, { merge: true });
  } catch (err) {
    console.error(`Lỗi khi cập nhật trạng thái lịch ${id} trên Firestore:`, err);
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
    const payload = {
      id: ctv.id,
      name: ctv.name,
      phone: ctv.phone || '',
      note: ctv.note || '',
      active: typeof ctv.active === 'boolean' ? ctv.active : true,
      updatedAt: Date.now()
    };
    await setDoc(ctvRef, payload, { merge: true });
  } catch (err) {
    console.error(`Lỗi khi lưu CTV ${ctv.id} lên Firestore:`, err);
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
  } catch (err) {
    console.error(`Lỗi khi xóa CTV ${id} khỏi Firestore:`, err);
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
