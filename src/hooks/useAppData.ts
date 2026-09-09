import { useState, useEffect, useCallback, useRef } from 'react';
import { Booking, CTV, MakeupPackage, Customer, BookingStatus } from '../types';
import {
  getCachedBookings,
  cacheBookingsLocally,
  getPackages,
  getCustomers,
  savePackage,
  deletePackage,
  resetDemoData,
  upsertCustomerFromBooking
} from '../services/storageService';
import {
  subscribeToFirestoreBookings,
  subscribeToFirestoreCTVs,
  saveBookingToFirestore,
  deleteBookingFromFirestore,
  updateBookingStatusInFirestore,
  saveCTVToFirestore,
  deleteCTVFromFirestore
} from '../services/firebase';

export function useAppData() {
  // Khởi tạo danh sách lịch: bắt đầu từ bộ nhớ đệm offline (chỉ đọc),
  // sau đó được thay thế 100% bằng Firestore Realtime snapshot ngay khi kết nối.
  // TUYỆT ĐỐI KHÔNG lấy mảng này đẩy đè lên Firestore!
  const [bookings, setBookings] = useState<Booking[]>(() => getCachedBookings());
  
  // Danh mục CTV: Nguồn chuẩn duy nhất từ Cloud Firestore collection 'ctvs',
  // Không lưu riêng lẻ ở localStorage của từng máy nữa.
  const [ctvs, setCtvs] = useState<CTV[]>([]);
  
  const [packages, setPackages] = useState<MakeupPackage[]>(() => getPackages());
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'syncing' | 'error'>('connecting' as any);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Ref giữ danh sách booking mới nhất để truy xuất đồng bộ mà không cần phụ thuộc vào dependency array
  const bookingsRef = useRef<Booking[]>(bookings);
  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);

  const refreshAll = useCallback(() => {
    setPackages(getPackages());
    setCustomers(getCustomers());
  }, []);

  // 1. Lắng nghe thay đổi thời gian thực (Realtime Listener) từ Firebase Firestore:
  // Thiết lập 2 bộ lắng nghe song song:
  // - onSnapshot(collection(db, 'bookings'), ...)
  // - onSnapshot(collection(db, 'ctvs'), ...)
  // Nguyên tắc bảo vệ dữ liệu: Khi vừa mở app, KHÔNG ĐƯỢC lấy dữ liệu cũ trong máy đẩy ngược lên Cloud.
  // Dữ liệu trên Firestore là nguồn chuẩn duy nhất (Single Source of Truth).
  // Bất kỳ máy nào (Máy A, Máy B, iPad, điện thoại) tạo/sửa/xóa đều tự động cập nhật tức thì.
  useEffect(() => {
    // Bộ lắng nghe 1: Lịch hẹn (Bookings)
    const unsubBookings = subscribeToFirestoreBookings(
      (firestoreBookings) => {
        setFirestoreStatus('connected');
        setFirestoreError(null);

        // Cập nhật state trực tiếp từ Firestore realtime
        setBookings(firestoreBookings);

        // Lưu vào bộ nhớ đệm LocalStorage thuần túy chỉ để đọc khi mất mạng
        // TUYỆT ĐỐI không bao giờ lấy cache này để đẩy đè lên Firestore!
        cacheBookingsLocally(firestoreBookings);
      },
      (error) => {
        setFirestoreStatus('error');
        setFirestoreError(error.message || 'Lỗi kết nối Firestore');
        console.warn('Lỗi Firestore bookings:', error);
      }
    );

    // Bộ lắng nghe 2: Cộng tác viên (CTVs)
    const unsubCTVs = subscribeToFirestoreCTVs(
      (firestoreCTVs) => {
        setCtvs(firestoreCTVs);
      },
      (error) => {
        console.warn('Lỗi Firestore ctvs:', error);
      }
    );

    return () => {
      unsubBookings();
      unsubCTVs();
    };
  }, []);

  // Lắng nghe sự kiện lưu trữ nội bộ (gói make, khách hàng)
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
  // Gọi setDoc(doc(db, 'bookings', item.id), item, { merge: true }) cho đúng lịch đó.
  // Tuyệt đối KHÔNG gom cả danh sách mảng để ghi đè toàn bộ collection.
  const handleSaveBooking = useCallback(async (booking: Booking) => {
    const now = Date.now();
    const normalizedBooking: Booking = {
      ...booking,
      createdAt: booking.createdAt || now,
      updatedAt: now
    };

    // 1. Cập nhật lạc quan (Optimistic update) trên giao diện máy hiện tại để phản hồi tức thì
    setBookings((prev) => {
      const idx = prev.findIndex((b) => b.id === booking.id);
      let next: Booking[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = normalizedBooking;
      } else {
        next = [...prev, normalizedBooking];
      }
      next.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
      cacheBookingsLocally(next);
      return next;
    });

    // 2. Gửi đúng Document này lên Firestore: setDoc(doc(db, 'bookings', item.id), item, { merge: true })
    try {
      setFirestoreStatus('syncing');
      await saveBookingToFirestore(normalizedBooking);
      setFirestoreStatus('connected');
      setFirestoreError(null);
    } catch (err: any) {
      console.error(`Lỗi khi lưu lịch ${booking.id} lên Firestore:`, err);
      setFirestoreStatus('error');
      setFirestoreError(err?.message || 'Không thể đồng bộ lên Cloud');
    }

    // Tự động lưu khách hàng nếu có
    if (booking.customerPhone && booking.customerName) {
      upsertCustomerFromBooking(normalizedBooking);
    }

    return normalizedBooking;
  }, []);

  // Xóa lịch: Chỉ gọi deleteDoc(doc(db, 'bookings', item.id)) cho đúng lịch bị xóa
  const handleDeleteBooking = useCallback(async (id: string) => {
    // 1. Cập nhật lạc quan trên giao diện và cache
    setBookings((prev) => {
      const next = prev.filter((b) => b.id !== id);
      cacheBookingsLocally(next);
      return next;
    });

    // 2. Gọi deleteDoc trên Firestore
    try {
      setFirestoreStatus('syncing');
      await deleteBookingFromFirestore(id);
      setFirestoreStatus('connected');
      setFirestoreError(null);
    } catch (err: any) {
      console.error(`Lỗi khi xóa lịch ${id} khỏi Firestore:`, err);
      setFirestoreStatus('error');
      setFirestoreError(err?.message || 'Lỗi xóa lịch trên Cloud');
    }
  }, []);

  // Đổi trạng thái lịch: Chỉ cập nhật đúng Document đó trên Firestore
  const handleStatusChange = useCallback(async (id: string, status: BookingStatus) => {
    const now = Date.now();
    const target = bookingsRef.current.find((b) => b.id === id);

    // 1. Cập nhật lạc quan trên giao diện và cache
    setBookings((prev) => {
      const next = prev.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            status,
            remainingAmount: status === 'paid' ? 0 : b.remainingAmount,
            updatedAt: now
          };
        }
        return b;
      });
      cacheBookingsLocally(next);
      return next;
    });

    // 2. Cập nhật lên Firestore an toàn
    try {
      setFirestoreStatus('syncing');
      if (target) {
        // Lưu lại toàn bộ document đã cập nhật trạng thái
        // Đảm bảo không bao giờ bị tình trạng mất các trường date/customerName
        const fullUpdated: Booking = {
          ...target,
          status,
          remainingAmount: status === 'paid' ? 0 : target.remainingAmount,
          updatedAt: now
        };
        await saveBookingToFirestore(fullUpdated);
      } else {
        const extra: Partial<Booking> = {};
        if (status === 'paid') {
          extra.remainingAmount = 0;
        }
        await updateBookingStatusInFirestore(id, status, extra);
      }
      setFirestoreStatus('connected');
      setFirestoreError(null);
    } catch (err: any) {
      console.error(`Lỗi khi cập nhật trạng thái lịch ${id} trên Firestore:`, err);
      setFirestoreStatus('error');
      setFirestoreError(err?.message || 'Lỗi cập nhật trạng thái trên Cloud');
    }
  }, []);

  // Thêm mới hoặc Sửa CTV: Lưu từng bản ghi ĐỘC LẬP lên collection 'ctvs'
  // setDoc(doc(db, 'ctvs', item.id), item, { merge: true })
  const handleSaveCTV = useCallback(async (ctv: CTV) => {
    // 1. Cập nhật lạc quan trên giao diện máy hiện tại
    setCtvs((prev) => {
      const idx = prev.findIndex((c) => c.id === ctv.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = ctv;
        return next.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
      }
      const next = [...prev, ctv];
      return next.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
    });

    // 2. Lưu trực tiếp Document lên collection 'ctvs' trên Firestore
    try {
      await saveCTVToFirestore(ctv);
    } catch (err) {
      console.error(`Lỗi khi lưu CTV ${ctv.id} lên Firestore:`, err);
    }
  }, []);

  // Xóa CTV: Chỉ gọi deleteDoc(doc(db, 'ctvs', item.id)) cho đúng Document ID
  const handleDeleteCTV = useCallback(async (id: string) => {
    // 1. Cập nhật lạc quan trên giao diện máy hiện tại
    setCtvs((prev) => prev.filter((c) => c.id !== id));

    // 2. Xóa trực tiếp Document khỏi Firestore collection 'ctvs'
    try {
      await deleteCTVFromFirestore(id);
    } catch (err) {
      console.error(`Lỗi khi xóa CTV ${id} khỏi Firestore:`, err);
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
