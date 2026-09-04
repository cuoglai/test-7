import React, { useState, useMemo, useEffect } from 'react';
import { ActiveTab, CalendarMode, Booking } from './types';
import { useAppData } from './hooks/useAppData';
import { CalendarView } from './components/calendar/CalendarView';
import { BookingListView } from './components/booking/BookingListView';
import { RevenueView } from './components/revenue/RevenueView';
import { SettingsView } from './components/settings/SettingsView';
import { BottomNav } from './components/layout/BottomNav';
import { BookingDetailModal } from './components/booking/BookingDetailModal';
import { BookingFormModal } from './components/booking/BookingFormModal';
import { findCTVConflicts } from './services/conflictService';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { registerServiceWorker, scheduleBookingReminders } from './services/notificationService';
import { getDefaultReminder } from './services/storageService';

function AppContent() {
  const {
    bookings,
    ctvs,
    firestoreStatus,
    firestoreError,
    saveBooking,
    deleteBooking,
    updateBookingStatus,
    syncAllToFirestore,
    saveCTV,
    deleteCTV,
    resetDemoData
  } = useAppData();

  const { isDark } = useTheme();

  // Navigation & Calendar states
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('day');

  // Today's anchor date
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const [currentDate, setCurrentDate] = useState<string>(todayDateStr);

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);

  // Handlers
  const handleOpenAddModal = () => {
    setBookingToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setBookingToEdit(booking);
    setIsFormModalOpen(true);
  };

  const handleSaveBooking = (booking: Booking) => {
    saveBooking(booking);
    if (selectedBooking && selectedBooking.id === booking.id) {
      setSelectedBooking(booking);
    }
  };

  const handleDeleteBooking = (id: string) => {
    deleteBooking(id);
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking(null);
    }
  };

  const handleStatusChange = (id: string, status: Booking['status']) => {
    updateBookingStatus(id, status);
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking({
        ...selectedBooking,
        status,
        remainingAmount: status === 'paid' ? 0 : selectedBooking.remainingAmount
      });
    }
  };

  // Conflict check for currently opened detail modal
  const selectedBookingConflict = useMemo(() => {
    if (!selectedBooking) return false;
    const conflicts = findCTVConflicts(bookings, {
      id: selectedBooking.id,
      date: selectedBooking.date,
      startTime: selectedBooking.startTime,
      endTime: selectedBooking.endTime,
      performerType: selectedBooking.performerType,
      ctvId: selectedBooking.ctvId
    });
    return conflicts.length > 0;
  }, [selectedBooking, bookings]);

  // Đăng ký Service Worker khi khởi động ứng dụng
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Tự động lên lịch thông báo đẩy / chuông nhắc cho các ca makeup sắp diễn ra
  useEffect(() => {
    const defaultRem = getDefaultReminder();
    scheduleBookingReminders(bookings, defaultRem);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleBookingReminders(bookings, getDefaultReminder());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [bookings]);

  return (
    <div
      id="app-root-container"
      style={{ minHeight: '-webkit-fill-available' }}
      className={`w-full h-full flex flex-col overflow-hidden font-sans m-0 p-0 transition-colors ${
        isDark ? 'bg-[#000000] text-white' : 'bg-white text-[#1C1C1E]'
      }`}
    >
      {/* Tab View Routing */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {activeTab === 'calendar' && (
            <CalendarView
              currentDate={currentDate}
              mode={calendarMode}
              bookings={bookings}
              todayDateStr={todayDateStr}
              onDateChange={setCurrentDate}
              onModeChange={setCalendarMode}
              onSelectBooking={(b) => setSelectedBooking(b)}
              onOpenAddBooking={handleOpenAddModal}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingListView
              bookings={bookings}
              onSelectBooking={(b) => setSelectedBooking(b)}
              onOpenAddBooking={handleOpenAddModal}
            />
          )}

          {activeTab === 'revenue' && (
            <RevenueView
              bookings={bookings}
              currentDate={currentDate}
              onSelectBooking={(b) => setSelectedBooking(b)}
              onOpenAddBooking={handleOpenAddModal}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              onResetDemo={resetDemoData}
              ctvs={ctvs}
              bookings={bookings}
              onSaveCTV={saveCTV}
              onDeleteCTV={deleteCTV}
              onSelectBooking={(b) => setSelectedBooking(b)}
              firestoreStatus={firestoreStatus}
              firestoreError={firestoreError}
              onSyncAllToFirestore={syncAllToFirestore}
            />
          )}
        </main>

        {/* Bottom Tab Bar with Floating Action Button */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenAddModal={handleOpenAddModal}
        />

        {/* Booking Detail Modal */}
        <BookingDetailModal
          booking={selectedBooking}
          hasConflict={selectedBookingConflict}
          onClose={() => setSelectedBooking(null)}
          onEdit={handleEditBooking}
          onDelete={handleDeleteBooking}
          onMarkStatus={handleStatusChange}
        />

        {/* Booking Add / Edit Form Modal */}
        <BookingFormModal
          isOpen={isFormModalOpen}
          initialDate={currentDate}
          editBooking={bookingToEdit}
          ctvs={ctvs}
          allBookings={bookings}
          onClose={() => {
            setIsFormModalOpen(false);
            setBookingToEdit(null);
          }}
          onSave={handleSaveBooking}
        />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
