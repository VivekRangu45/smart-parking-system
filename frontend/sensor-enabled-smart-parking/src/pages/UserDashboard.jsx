import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import api, { SOCKET_URL, getSocketOptions } from '../config/api.js';
import ReAuthModal from '../components/ReAuthModal.jsx';
import QrPass from '../components/QrPass.jsx';
import './UserDashboard.css';

export default function UserDashboard() {
  const [zones, setZones] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [activeBookings, setActiveBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [isBooking, setIsBooking] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [now, setNow] = useState(new Date());
  
  // Re-Auth Modal State
  const [isReAuthOpen, setIsReAuthOpen] = useState(false);
  const [pendingZoneId, setPendingZoneId] = useState(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Helper function to refresh bookings data
  const fetchBookings = async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        api.get('/bookings/active/me'),
        api.get('/bookings/history/me'),
      ]);
      setActiveBookings(Array.isArray(activeRes.data) ? activeRes.data : []);
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (err) {
      console.error('Failed to fetch user bookings:', err);
    }
  };

  useEffect(() => {
    let socket;

    const init = async () => {
      const socketOptions = await getSocketOptions();
      socket = io(SOCKET_URL, socketOptions);

      try {
        const [zonesRes, slotsRes] = await Promise.all([
          api.get('/zones'),
          api.get('/slots'),
        ]);
        setZones(zonesRes.data || []);
        setSlots(slotsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch zones/slots data:', err);
      }
      await fetchBookings();

      socket.on('slot_update', (data) => {
        setSlots((prev) =>
          prev.map((s) => (String(s.id) === String(data.slot_id) ? { ...s, is_occupied: data.status } : s))
        );
      });

      socket.on('booking_created', () => {
        api.get('/slots').then((res) => setSlots(res.data || []));
        fetchBookings();
      });

      socket.on('bookings_updated', () => {
        fetchBookings();
        api.get('/slots').then((res) => setSlots(res.data || []));
      });
    };

    init();

    const timer = setInterval(() => setNow(new Date()), 1000);

    return () => {
      clearInterval(timer);
      if (socket) {
        socket.off('slot_update');
        socket.off('booking_created');
        socket.off('bookings_updated');
        socket.disconnect();
      }
    };
  }, []);

  const handleBook = (zoneId) => {
    setMessage({ text: '', type: '' });
    // Open re-auth modal instead of booking directly
    setPendingZoneId(zoneId);
    setIsReAuthOpen(true);
  };

  const handleConfirmBooking = async () => {
    setIsReAuthOpen(false);
    setIsBooking(true);
    try {
      const res = await api.post('/bookings', {
        zone_id: Number(pendingZoneId),
      });
      const booking = res.data.booking;
      setActiveBookings((prev) => [...prev, booking]);
      setMessage({ text: `Slot #${booking.slot_id} booked successfully!`, type: 'success' });

      await fetchBookings();
      
      // Refresh slots
      const slotsRes = await api.get('/slots');
      setSlots(slotsRes.data || []);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Booking failed', type: 'error' });
    } finally {
      setIsBooking(false);
      setPendingZoneId(null);
    }
  };

  const handleCancel = async (bookingId) => {
    try {
      await api.put(`/bookings/cancel/${bookingId}`);
      setActiveBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setMessage({ text: 'Booking cancelled successfully.', type: 'success' });
      await fetchBookings();
      const slotsRes = await api.get('/slots');
      setSlots(slotsRes.data || []);
    } catch (err) {
      setMessage({ text: 'Cancel failed', type: 'error' });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Helper to format countdown duration
  const getCountdownStr = (expiresAt) => {
    const diff = new Date(expiresAt) - now;
    if (diff <= 0) return 'Expiring…';
    const totalSecs = Math.floor(diff / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
  };

  const getZoneLetter = (zoneId) => {
    const zoneMap = { 1: 'A', 2: 'B', 3: 'C' };
    return zoneMap[zoneId] || String(zoneId);
  };

  // Compute stats per zone
  const zoneList = zones.map((z) => {
    const zoneSlots = slots.filter((s) => s.zone_id === z.id);
    const total = zoneSlots.length;
    const occupied = zoneSlots.filter((s) => s.is_occupied).length;
    const available = total - occupied;
    return { ...z, total, occupied, available };
  });

  return (
    <div className="user-dashboard">
      <header className="dashboard-header">
        <div className="logo-section">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          </div>
          <div>
            <h1>Smart Parking</h1>
            <p>Redesigned User Panel</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {message.text && (
        <div className={`message ${message.type}`}>
          <div className="message-content">
            <span className="message-text">{message.text}</span>
            <button className="close-msg" onClick={() => setMessage({ text: '', type: '' })}>×</button>
          </div>
        </div>
      )}

      {/* Active Bookings (Only User's) */}
      {activeBookings.length > 0 && (
        <div className="section-card active-booking-section">
          <h3>My Active Booking</h3>
          <div className="active-bookings-grid">
            {activeBookings.map((b) => (
              <div key={b.id} className="active-booking-card">
                <div className="booking-status-glow"></div>
                <div className="active-booking-header">
                  <div className="slot-badge">Slot #{b.slot_id}</div>
                  <div className="zone-badge">Zone {getZoneLetter(b.zone_id)}</div>
                </div>
                <div className="active-booking-body">
                  <div className="time-stat">
                    <span className="time-label">Started</span>
                    <span className="time-value">{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="time-stat">
                    <span className="time-label">Max Duration</span>
                    <span className="time-value">2 hours</span>
                  </div>
                    <div className="countdown-timer">
                      <div className="timer-icon">⏱</div>
                      <div className="timer-text">
                        <div className="timer-value">{getCountdownStr(b.expires_at)}</div>
                        <div className="timer-sub">until automatic release</div>
                      </div>
                    </div>
                  </div>
                  
                  {b.qr_code && (
                    <QrPass 
                      qrBase64={b.qr_code} 
                      bookingId={b.id} 
                      zoneId={b.zone_id} 
                      slotId={b.slot_id} 
                      expiry={b.expires_at} 
                    />
                  )}

                  <button className="btn-cancel" onClick={() => handleCancel(b.id)}>
                    Release & Complete
                  </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Zones */}
      <div className="section-card">
        <h3>Available Zones</h3>
        <p className="section-desc">Select a zone below to view its slots and book a space.</p>
        
        <div className="zone-cards-grid">
          {zoneList.map((z) => {
            const isSelected = String(selectedZone) === String(z.id);
            return (
              <div 
                key={z.id} 
                className={`zone-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedZone(z.id)}
              >
                <div className="zone-card-header">
                  <h4>Zone {z.name}</h4>
                  {isSelected && <span className="active-indicator">Viewing</span>}
                </div>
                <div className="zone-card-stats">
                  <div className="card-stat free">
                    <span className="stat-num">{z.available}</span>
                    <span className="stat-lbl">Available</span>
                  </div>
                  <div className="card-stat occupied">
                    <span className="stat-num">{z.occupied}</span>
                    <span className="stat-lbl">Occupied</span>
                  </div>
                </div>
                <button className="btn-view-slots">
                  {isSelected ? 'Viewing Slots' : 'View Slots'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slots of Selected Zone */}
      {selectedZone && (
        <div className="section-card slots-section-card animate-fade-in">
          <div className="slots-header">
            <h3>Slots in Zone {getZoneLetter(selectedZone)}</h3>
            <div className="legend">
              <span className="legend-item"><span className="legend-dot free"></span>Available</span>
              <span className="legend-item"><span className="legend-dot occupied"></span>Occupied</span>
            </div>
          </div>
          
          <div className="slots-grid">
            {slots
              .filter((s) => String(s.zone_id) === String(selectedZone))
              .map((s) => (
                <div 
                  key={s.id} 
                  className={`slot-cell ${s.is_occupied ? 'occupied' : 'free'}`}
                >
                  <span className="slot-number">#{s.slot_number}</span>
                  <span className="slot-status-text">{s.is_occupied ? 'Occupied' : 'Free'}</span>
                </div>
              ))}
          </div>

          <div className="quick-booking-action">
            <div className="action-info">
              <h4>Ready to park in Zone {getZoneLetter(selectedZone)}?</h4>
              <p>Booking will allocate an available slot for a maximum of 2 hours for ₹50.</p>
            </div>
            <button 
              className="btn-book-action"
              onClick={() => handleBook(selectedZone)}
              disabled={isBooking || slots.filter((s) => String(s.zone_id) === String(selectedZone) && !s.is_occupied).length === 0}
            >
              {isBooking ? 'Allocating…' : 'Book & Pay ₹50'}
            </button>
          </div>
        </div>
      )}

      {/* My Booking History (Only User's) */}
      <div className="section-card">
        <h3>My Booking History</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Zone</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Start Time</th>
                <th>End Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>Zone {getZoneLetter(b.zone_id)}</td>
                  <td>Slot {b.slot_id}</td>
                  <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                  <td>{new Date(b.start_time).toLocaleString()}</td>
                  <td>{b.end_time ? new Date(b.end_time).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="6" className="no-data">
                    You have no previous booking history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReAuthModal 
        isOpen={isReAuthOpen} 
        onClose={() => setIsReAuthOpen(false)} 
        onSuccess={handleConfirmBooking} 
      />
    </div>
  );
}
