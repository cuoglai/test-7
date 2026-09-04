import { useState, useEffect, useCallback, useRef } from 'react';
import { Booking, CTV, MakeupPackage, Customer, BookingStatus } from '../types';
import {
  getBookings,
  getCTVs,
  getPackages,
  getCustomers,
  saveBooking as saveBookingLocal,
  deleteBooking as deleteBookingLocal,
  updateBookingStatus as updateBookingStatusLocal,
  savePackage,
  deletePackage,
  saveCTV,
  deleteCTV,
  resetDemoData,
  saveBookingsBatch
} from '../services/storageService';
import {
  subscribeToFirestoreBookings,
  saveBookingToFirestore,
  deleteBookingFromFirestore,
  updateBookingStatusInFirestore,
  uploadBookingsToFirestore
} from '../services/firebase';

export function useAppData() {
  const [bookings, setBookings] = useState<Booking[]>(() => getBookings());
  const [ctvs, setCtvs] = useState<CTV[]>(() => getCTVs());
  const [packages, setPackages] = useState<MakeupPackage[]>(() => getPackages());
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'syncing' | 'error'>('connecting' as any);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Đánh dấu đã nhận dữ liệu từ Firestore lần đầu
  const hasReceivedFirestoreFirstSnapshot = useRef(false);

  const refreshAll = useCallback(() => {
    setBookings(getBookings());
    setCtvs(getCTVs());
    setPackages(getPackages());
    setCustomers(getCustomers());
  }, []);

  // 1. Lắng nghe thay đổi thời gian thực (Realtime) từ Firebase Firestore
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreBookings(
      (firestoreBookings) => {
        setFirestoreStatus('connected');
        setFirestoreError(null);

        if (firestoreBookings.length > 0) {
          // Cập nhật state trực tiếp từ Firestore realtime
          setBookings(firestoreBookings);
          // Lưu vào bộ nhớ đệm LocalStorage để mở app siêu nhanh
          saveBookingsBatch(firestoreBookings);
          hasReceivedFirestoreFirstSnapshot.current = true;
        } else {
          // Nếu Firestore collection 'bookings' còn trống
          if (!hasReceivedFirestoreFirstSnapshot.current) {
            hasReceivedFirestoreFirstSnapshot.current = true;
            const currentLocal = getBookings();
            if (currentLocal.length > 0) {
              // Tự động đồng bộ các lịch mẫu / lịch hiện có lên Firestore
              uploadBookingsToFirestore(currentLocal).catch((e) => {
                console.warn('Không thể tự động đồng bộ lịch mẫu lên Firestore:', e);
              });
            }
          }
        }
      },
      (error) => {
        setFirestoreStatus('error');
        setFirestoreError(error.message || 'Lỗi kết nối Firestore');
        console.warn('Lỗi kết nối Firebase Firestore, chuyển sang bộ nhớ cục bộ:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Lắng nghe sự kiện lưu trữ nội bộ
  useEffect(() => {
    const handleStorageChange = () => {
      refreshAll();
    };
    window.addEventListener('makeup_storage_change', handleStorageChange);
    return () => {
      window.removeEventListener('makeup_storage_change', handleStorageChange);
    };
  }, [refreshAll]);

  // Tạo mới hoặc cập nhật lịch makeup -> Lưu Firestore trực tiếp + cập nhật tức thì
  const handleSaveBooking = useCallback(async (booking: Booking) => {
    // 1. Cập nhật ngay lập tức vào bộ nhớ cục bộ và giao diện
    const saved = saveBookingLocal(booking);
    setBookings(getBookings());

    // 2. Cập nhật trực tiếp lên Firestore theo thời gian thực (realtime)
    try {
      await saveBookingToFirestore(saved);
    } catch (err) {
      console.error('Không thể đồng bộ lịch lên Firestore:', err);
    }
    return saved;
  }, []);

  // Xóa lịch makeup -> Xóa Firestore trực tiếp + cập nhật tức thì
  const handleDeleteBooking = useCallback(async (id: string) => {
    // 1. Cập nhật giao diện và bộ nhớ cục bộ
    deleteBookingLocal(id);
    setBookings(getBookings());

    // 2. Xóa trên Firestore theo thời gian thực
    try {
      await deleteBookingFromFirestore(id);
    } catch (err) {
      console.error('Không thể xóa lịch khỏi Firestore:', err);
    }
  }, []);

  // Đổi trạng thái lịch (pending, confirmed, completed, paid, cancelled)
  const handleStatusChange = useCallback(async (id: string, status: BookingStatus) => {
    updateBookingStatusLocal(id, status);
    setBookings(getBookings());

    try {
      const extra: Partial<Booking> = {};
      if (status === 'paid') {
        extra.remainingAmount = 0;
      }
      await updateBookingStatusInFirestore(id, status, extra);
    } catch (err) {
      console.error('Không thể cập nhật trạng thái lịch trên Firestore:', err);
    }
  }, []);

  // Đồng bộ toàn bộ dữ liệu từ máy lên Firestore
  const handleSyncAllToFirestore = useCallback(async () => {
    const current = getBookings();
    setFirestoreStatus('syncing');
    try {
      const count = await uploadBookingsToFirestore(current);
      setFirestoreStatus('connected');
      return count;
    } catch (err: any) {
      setFirestoreStatus('error');
      setFirestoreError(err?.message || 'Đồng bộ thất bại');
      throw err;
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
    syncAllToFirestore: handleSyncAllToFirestore,
    savePackage: handleSavePackage,
    deletePackage: handleDeletePackage,
    saveCTV: handleSaveCTV,
    deleteCTV: handleDeleteCTV,
    resetDemoData: handleResetDemo,
    refreshAll
  };
}
