import { useState, useEffect, useCallback } from 'react';
import { Booking, CTV, MakeupPackage, Customer, BookingStatus } from '../types';
import {
  getCachedBookings,
  cacheBookingsLocally,
  getCTVs,
  getPackages,
  getCustomers,
  savePackage,
  deletePackage,
  saveCTV,
  deleteCTV,
  resetDemoData,
  upsertCustomerFromBooking
} from '../services/storageService';
import {
  subscribeToFirestoreBookings,
  addBookingToFirestore,
  updateBookingInFirestore,
  deleteBookingFromFirestore,
  updateBookingStatusInFirestore
} from '../services/firebase';

export function useAppData() {
  // Khởi tạo danh sách lịch: bắt đầu từ bộ nhớ đệm offline,
  // sau đó được thay thế 100% bằng Firestore Realtime snapshot ngay khi kết nối.
  // TUYỆT ĐỐI KHÔNG lấy mảng này đẩy đè lên Firestore!
  const [bookings, setBookings] = useState<Booking[]>(() => getCachedBookings());
  const [ctvs, setCtvs] = useState<CTV[]>(() => getCTVs());
  const [packages, setPackages] = useState<MakeupPackage[]>(() => getPackages());
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'syncing' | 'error'>('connecting' as any);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const refreshAll = useCallback(() => {
    setCtvs(getCTVs());
    setPackages(getPackages());
    setCustomers(getCustomers());
  }, []);

  // 1. Lắng nghe thay đổi thời gian thực (Realtime Listener) từ Firebase Firestore:
  // Danh sách hiển thị trên màn hình PHẢI được lấy 100% từ kết quả trả về của Firestore.
  // Bất kỳ máy nào (Máy A, Máy B, máy tính) tạo/sửa/xóa đều tự động cập nhật tức thì.
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreBookings(
      (firestoreBookings) => {
        setFirestoreStatus('connected');
        setFirestoreError(null);

        // Cập nhật state trực tiếp từ Firestore realtime
        setBookings(firestoreBookings);

        // Lưu vào bộ nhớ đệm LocalStorage thuần túy chỉ để đọc khi mất mạng/mở app nhanh
        // TUYỆT ĐỐI không bao giờ lấy cache này để đẩy đè lên Firestore!
        cacheBookingsLocally(firestoreBookings);
      },
      (error) => {
        setFirestoreStatus('error');
        setFirestoreError(error.message || 'Lỗi kết nối Firestore');
        console.warn('Lỗi Firestore:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Lắng nghe sự kiện lưu trữ nội bộ (gói make, ctv)
  useEffect(() => {
    const handleStorageChange = () => {
      refreshAll();
    };
    window.addEventListener('makeup_storage_change', handleStorageChange);
    return () => {
      window.removeEventListener('makeup_storage_change', handleStorageChange);
    };
  }, [refreshAll]);

  // Thêm mới hoặc Sửa lịch: Lưu từng lịch ĐỘC LẬP vào Document riêng
  // Khi thêm lịch mới: Chỉ gọi setDoc cho đúng Document ID vừa tạo
  // Khi sửa lịch: Chỉ gọi updateDoc / setDoc(merge) cho đúng Document ID được sửa
  const handleSaveBooking = useCallback(async (booking: Booking) => {
    const isExisting = bookings.some((b) => b.id === booking.id);
    const now = Date.now();

    const normalizedBooking: Booking = {
      ...booking,
      createdAt: booking.createdAt || now,
      updatedAt: now
    };

    // 1. Cập nhật lạc quan (Optimistic update) trên giao diện máy hiện tại
    setBookings((prev) => {
      const idx = prev.findIndex((b) => b.id === booking.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = normalizedBooking;
        return next;
      }
      return [...prev, normalizedBooking].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
    });

    // 2. Gửi đúng Document này lên Firestore theo chuẩn độc lập
    try {
      if (isExisting) {
        await updateBookingInFirestore(normalizedBooking.id, normalizedBooking);
      } else {
        await addBookingToFirestore(normalizedBooking);
      }
    } catch (err) {
      console.error(`Lỗi khi lưu lịch ${booking.id} lên Firestore:`, err);
    }

    // Tự động lưu khách hàng nếu có
    if (booking.customerPhone && booking.customerName) {
      upsertCustomerFromBooking(normalizedBooking);
    }

    return normalizedBooking;
  }, [bookings]);

  // Xóa lịch: Chỉ gọi deleteDoc cho đúng lịch bị xóa
  const handleDeleteBooking = useCallback(async (id: string) => {
    // 1. Cập nhật lạc quan trên giao diện
    setBookings((prev) => prev.filter((b) => b.id !== id));

    // 2. Gọi deleteDoc trên Firestore
    try {
      await deleteBookingFromFirestore(id);
    } catch (err) {
      console.error(`Lỗi khi xóa lịch ${id} khỏi Firestore:`, err);
    }
  }, []);

  // Đổi trạng thái lịch: Chỉ cập nhật đúng Document đó
  const handleStatusChange = useCallback(async (id: string, status: BookingStatus) => {
    // 1. Cập nhật lạc quan trên giao diện
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            status,
            remainingAmount: status === 'paid' ? 0 : b.remainingAmount,
            updatedAt: Date.now()
          };
        }
        return b;
      })
    );

    // 2. Cập nhật lên Firestore
    try {
      const extra: Partial<Booking> = {};
      if (status === 'paid') {
        extra.remainingAmount = 0;
      }
      await updateBookingStatusInFirestore(id, status, extra);
    } catch (err) {
      console.error(`Lỗi khi cập nhật trạng thái lịch ${id} trên Firestore:`, err);
    }
  }, []);

  const handleSavePackage = useCallback((pkg: MakeupPackage) => {
    savePackage(pkg);
    refreshAll();
  }, [refreshAll]);

  const handleDeletePackage = useCallback((id: string) => {
    deletePackage(id);
    refreshAll();
  }, [refreshAll]);

  const handleSaveCTV = useCallback((ctv: CTV) => {
    saveCTV(ctv);
    refreshAll();
  }, [refreshAll]);

  const handleDeleteCTV = useCallback((id: string) => {
    deleteCTV(id);
    refreshAll();
  }, [refreshAll]);

  const handleResetDemo = useCallback(() => {
    resetDemoData();
    refreshAll();
  }, [refreshAll]);

  return {
    bookings,
    ctvs,
    packages,
    customers,
    firestoreStatus,
    firestoreError,
    saveBooking: handleSaveBooking,
    deleteBooking: handleDeleteBooking,
    updateBookingStatus: handleStatusChange,
    savePackage: handleSavePackage,
    deletePackage: handleDeletePackage,
    saveCTV: handleSaveCTV,
    deleteCTV: handleDeleteCTV,
    resetDemoData: handleResetDemo,
    refreshAll
  };
}
