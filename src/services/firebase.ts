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
import { Booking, BookingStatus } from '../types';

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

export const BOOKINGS_COLLECTION = 'bookings';

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
 * Thêm lịch mới: Lưu từng lịch độc lập vào collection 'bookings'
 * Sử dụng ID của lịch làm Document ID: doc(db, 'bookings', booking.id)
 * CHỈ gọi setDoc cho đúng lịch vừa tạo, TUYỆT ĐỐI không ghi đè danh sách!
 */
export async function addBookingToFirestore(booking: Booking): Promise<void> {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, booking.id);
    const now = Date.now();
    const payload = {
      ...booking,
      createdAt: booking.createdAt || now,
      updatedAt: now
    };
    await setDoc(bookingRef, payload);
  } catch (err) {
    console.error(`Lỗi khi tạo lịch ${booking.id} lên Firestore:`, err);
    throw err;
  }
}

/**
 * Sửa lịch: CHỈ gọi updateDoc (hoặc setDoc với merge) cho đúng Document ID được sửa.
 * Không động chạm đến bất kỳ lịch nào khác trong Firestore.
 */
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
 * Lưu lịch makeup độc lập: tự động nhận diện tạo mới (setDoc) hoặc chỉnh sửa (setDoc merge)
 */
export async function saveBookingToFirestore(booking: Booking, isNew: boolean = false): Promise<void> {
  if (isNew) {
    await addBookingToFirestore(booking);
  } else {
    await updateBookingInFirestore(booking.id, booking);
  }
}

/**
 * Xóa lịch: CHỈ gọi deleteDoc cho đúng lịch bị xóa.
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
 * Cập nhật trạng thái lịch makeup trên Firestore: CHỈ gọi updateDoc cho đúng Document ID
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
    await updateDoc(bookingRef, updates);
  } catch (err) {
    console.error(`Lỗi khi cập nhật trạng thái lịch ${id} trên Firestore:`, err);
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
