import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Bar, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import api, { SOCKET_URL, getSocketOptions } from '../config/api.js';
import './AdminDashboard.css';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler
);

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [dailyBookings, setDailyBookings] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active-bookings');
  const [detectionStatus, setDetectionStatus] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchDetectionData = async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        api.get('/detection/status'),
        api.get('/detection/history'),
      ]);
      setDetectionStatus(statusRes.data || null);
      setDetectionHistory(historyRes.data || []);
    } catch (err) {
      console.error('Failed to fetch detection data:', err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [bookingsRes, slotsRes, occupancyRes, statsRes, dailyRes, usersRes] = await Promise.all([
        api.get('/bookings/all'),
        api.get('/slots'),
        api.get('/analytics/occupancy'),
        api.get('/analytics/stats'),
        api.get('/analytics/daily-bookings'),
        api.get('/users'),
      ]);
      setBookings(bookingsRes.data || []);
      setSlots(slotsRes.data || []);
      setOccupancy(occupancyRes.data || []);
      setStats(statsRes.data || null);
      setDailyBookings(dailyRes.data || []);
      setUsersList(usersRes.data || []);
      await fetchDetectionData();
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
  };

  useEffect(() => {
    let socket;

    const init = async () => {
      const socketOptions = await getSocketOptions();
      socket = io(SOCKET_URL, socketOptions);

      socket.on('booking_created', () => fetchAdminData());
      socket.on('slot_update', () => fetchAdminData());
      socket.on('bookings_updated', () => fetchAdminData());
      socket.on('detection_updated', () => fetchDetectionData());

      await fetchAdminData();
      setIsLoading(false);
    };

    init();

    return () => {
      if (socket) {
        socket.off('booking_created');
        socket.off('slot_update');
        socket.off('bookings_updated');
        socket.off('detection_updated');
        socket.disconnect();
      }
    };
  }, []);

  const handleApplyDetection = async () => {
    setActionMessage('');
    setIsDetecting(true);
    try {
      const res = await api.post('/detection/apply');
      setActionMessage(`Detection applied — ${res.data.slots_updated} slots updated.`);
      await fetchDetectionData();
      await fetchAdminData();
    } catch (err) {
      setActionMessage(err.response?.data?.error || 'Failed to apply detection.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleUploadDetection = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setActionMessage('');
    setIsDetecting(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/detection', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setActionMessage(
        `Detection complete — ${res.data.occupied_count} occupied, ${res.data.available_count} available.`
      );
      await fetchDetectionData();
      await fetchAdminData();
    } catch (err) {
      setActionMessage(err.response?.data?.error || 'Detection upload failed.');
    } finally {
      setIsDetecting(false);
      event.target.value = '';
    }
  };

  const handleForceRelease = async (slotId) => {
    setActionMessage('');
    try {
      await api.put(`/slots/${slotId}`, { is_occupied: false });
      setActionMessage(`Slot #${slotId} successfully released.`);
      await fetchAdminData();
    } catch (err) {
      console.error('Force release failed:', err);
      setActionMessage('Failed to release slot.');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    setActionMessage('');
    try {
      await api.put(`/bookings/cancel/${bookingId}`);
      setActionMessage(`Booking #${bookingId} successfully cancelled.`);
      await fetchAdminData();
    } catch (err) {
      console.error('Cancel booking failed:', err);
      setActionMessage('Failed to cancel booking.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Dynamic statistics calculations from backend
  const totalSlots = stats?.total_slots || 0;
  const occupiedSlots = stats?.occupied_slots || 0;
  const availableSlots = stats?.available_slots || 0;
  const occupancyPercentage = stats?.occupancy_percentage || '0.0';
  const activeBookingsCount = stats?.active_bookings || 0;
  const lifetimeRevenue = stats?.lifetime_revenue || 0;
  const todayRevenue = stats?.today_revenue || 0;

  // Chart configuration: Zone Occupancy
  const occupancyChartData = {
    labels: occupancy.map((o) => `Zone ${o.zone_name}`),
    datasets: [
      {
        label: 'Occupied Slots',
        data: occupancy.map((o) => Number(o.occupied_slots)),
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 8,
      },
      {
        label: 'Available Slots',
        data: occupancy.map((o) => Number(o.total_slots) - Number(o.occupied_slots)),
        backgroundColor: 'rgba(34, 197, 94, 0.75)',
        borderColor: '#22c55e',
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  // Chart configuration: Daily Bookings
  const dailyChartData = {
    labels: dailyBookings.map((db) => {
      const date = new Date(db.booking_date);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Bookings per Day',
        data: dailyBookings.map((db) => Number(db.booking_count)),
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        borderWidth: 3,
        pointBackgroundColor: '#a855f7',
        pointHoverRadius: 8,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: { family: 'Outfit, Inter', size: 12 },
        },
      },
      tooltip: {
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { family: 'Outfit, Inter' } },
        grid: { color: 'rgba(255,255,255,0.03)' },
      },
      y: {
        ticks: { 
          color: '#64748b', 
          font: { family: 'Outfit, Inter' },
          stepSize: 1,
        },
        grid: { color: 'rgba(255,255,255,0.03)' },
      },
    },
  };

  const getZoneLetter = (zoneId) => {
    const zoneMap = { 1: 'A', 2: 'B', 3: 'C' };
    return zoneMap[zoneId] || String(zoneId);
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <span>Loading Admin Workspace…</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1>Smart Parking Admin</h1>
            <p>System Overview & Control Panel</p>
          </div>
        </div>
        <div className="admin-header-actions">
          <span className="admin-email">{user?.email}</span>
          <button className="btn-logout-admin" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {actionMessage && (
        <div className="admin-alert animate-fade-in">
          <span>{actionMessage}</span>
          <button className="close-alert" onClick={() => setActionMessage('')}>×</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="card-lbl">Lifetime Revenue</span>
          <span className="card-val text-primary">₹{Number(lifetimeRevenue).toLocaleString()}</span>
          <span className="card-trend">Today: ₹{Number(todayRevenue).toLocaleString()}</span>
        </div>
        <div className="admin-stat-card">
          <span className="card-lbl">Active Bookings</span>
          <span className="card-val text-indigo">{activeBookingsCount}</span>
          <span className="card-trend">Currently occupied</span>
        </div>
        <div className="admin-stat-card">
          <span className="card-lbl">Total / Occupied Slots</span>
          <span className="card-val">{totalSlots} / <span className="text-danger">{occupiedSlots}</span></span>
          <span className="card-trend">Calculated dynamically</span>
        </div>
        <div className="admin-stat-card">
          <span className="card-lbl">Occupancy Percentage</span>
          <span className="card-val text-yellow">{occupancyPercentage}%</span>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${occupancyPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="admin-charts-grid">
        <div className="admin-chart-card">
          <h3>Zone Occupancy & Availability</h3>
          <div className="admin-chart-wrapper">
            <Bar data={occupancyChartData} options={chartOptions} />
          </div>
        </div>
        <div className="admin-chart-card">
          <h3>Booking Trends (Last 7 Days)</h3>
          <div className="admin-chart-wrapper">
            <Line data={dailyChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Zone Utilization Summary */}
      <div className="admin-section-card">
        <h3>Zone Utilization Analysis</h3>
        <div className="zone-utilization-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Zone Name</th>
                <th>Total Slots</th>
                <th>Occupied Slots</th>
                <th>Available Slots</th>
                <th>Utilization Rate</th>
              </tr>
            </thead>
            <tbody>
              {occupancy.map((zone) => {
                const total = Number(zone.total_slots);
                const occupied = Number(zone.occupied_slots);
                const rate = total > 0 ? ((occupied / total) * 100).toFixed(0) : 0;
                return (
                  <tr key={zone.zone_name}>
                    <td><strong>Zone {zone.zone_name}</strong></td>
                    <td>{total}</td>
                    <td className="text-danger">{occupied}</td>
                    <td className="text-success">{total - occupied}</td>
                    <td>
                      <div className="table-progress-align">
                        <span className="rate-number">{rate}%</span>
                        <div className="mini-progress-bar">
                          <div 
                            className={`mini-progress-fill ${rate > 70 ? 'danger' : rate > 30 ? 'warn' : 'good'}`} 
                            style={{ width: `${rate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabbed Interactive Control Panel */}
      <div className="admin-section-card tabs-section-card">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'active-bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('active-bookings')}
          >
            Active Bookings ({activeBookingsCount})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'recent-bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent-bookings')}
          >
            Recent Bookings ({bookings.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'slots-config' ? 'active' : ''}`}
            onClick={() => setActiveTab('slots-config')}
          >
            Slots Management
          </button>
          <button 
            className={`tab-btn ${activeTab === 'detection-management' ? 'active' : ''}`}
            onClick={() => setActiveTab('detection-management')}
          >
            Detection Management
          </button>
          <button 
            className={`tab-btn ${activeTab === 'users-management' ? 'active' : ''}`}
            onClick={() => setActiveTab('users-management')}
          >
            Registered Users ({usersList.length})
          </button>
        </div>

        <div className="tabs-content">
          {/* Tab 1: Current Active Bookings */}
          {activeTab === 'active-bookings' && (
            <div className="table-responsive-wrapper animate-fade-in">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>User Email</th>
                    <th>Zone</th>
                    <th>Slot ID</th>
                    <th>Start Time</th>
                    <th>Expires At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings
                    .filter((b) => b.status === 'active')
                    .map((b) => (
                      <tr key={b.id}>
                        <td>#{b.id}</td>
                        <td>
                          <div>{b.user_name || '—'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{b.user_email || `ID: ${b.user_id}`}</div>
                        </td>
                        <td>Zone {getZoneLetter(b.zone_id)}</td>
                        <td>Slot #{b.slot_id}</td>
                        <td>{new Date(b.start_time).toLocaleTimeString()}</td>
                        <td>
                          <span className="expires-at-time text-yellow">
                            {new Date(b.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn-action-cancel" 
                            onClick={() => handleCancelBooking(b.id)}
                          >
                            Cancel Booking
                          </button>
                        </td>
                      </tr>
                    ))}
                  {bookings.filter((b) => b.status === 'active').length === 0 && (
                    <tr>
                      <td colSpan="7" className="no-records">No active bookings currently.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Recent Bookings */}
          {activeTab === 'recent-bookings' && (
            <div className="table-responsive-wrapper animate-fade-in">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>User</th>
                    <th>Zone</th>
                    <th>Slot ID</th>
                    <th>Status</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 20).map((b) => (
                    <tr key={b.id}>
                      <td>#{b.id}</td>
                      <td>
                        <div>{b.user_name || '—'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{b.user_email || `ID: ${b.user_id}`}</div>
                      </td>
                      <td>Zone {getZoneLetter(b.zone_id)}</td>
                      <td>Slot #{b.slot_id}</td>
                      <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                      <td>{new Date(b.start_time).toLocaleString()}</td>
                      <td>{b.end_time ? new Date(b.end_time).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="7" className="no-records">No historical records available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Slots Management */}
          {activeTab === 'slots-config' && (
            <div className="table-responsive-wrapper animate-fade-in">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Slot ID</th>
                    <th>Zone</th>
                    <th>Slot Number</th>
                    <th>Occupancy Status</th>
                    <th>Admin Command</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s) => (
                    <tr key={s.id}>
                      <td>#{s.id}</td>
                      <td>Zone {getZoneLetter(s.zone_id)}</td>
                      <td>Slot {s.slot_number}</td>
                      <td>
                        <span className={`status-badge ${s.is_occupied ? 'occupied' : 'free'}`}>
                          {s.is_occupied ? 'Occupied' : 'Free'}
                        </span>
                      </td>
                      <td>
                        {s.is_occupied ? (
                          <button 
                            className="btn-action-release" 
                            onClick={() => handleForceRelease(s.id)}
                          >
                            Release Slot
                          </button>
                        ) : (
                          <span className="text-muted">Idle</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Detection Management */}
          {activeTab === 'detection-management' && (
            <div className="animate-fade-in">
              <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="admin-stat-card">
                  <span className="card-lbl">Last Detection Run</span>
                  <span className="card-val text-indigo">
                    {detectionStatus?.timestamp
                      ? new Date(detectionStatus.timestamp).toLocaleString()
                      : '—'}
                  </span>
                </div>
                <div className="admin-stat-card">
                  <span className="card-lbl">Occupied Slots</span>
                  <span className="card-val text-danger">{detectionStatus?.occupied_count ?? 0}</span>
                </div>
                <div className="admin-stat-card">
                  <span className="card-lbl">Available Slots</span>
                  <span className="card-val text-success">{detectionStatus?.available_count ?? 0}</span>
                </div>
                <div className="admin-stat-card">
                  <span className="card-lbl">Total Tracked</span>
                  <span className="card-val">{detectionStatus?.total_slots ?? 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn-action-release"
                  onClick={handleApplyDetection}
                  disabled={isDetecting}
                >
                  {isDetecting ? 'Processing…' : 'Apply Latest Detection JSON'}
                </button>
                <label className="btn-action-cancel" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  {isDetecting ? 'Uploading…' : 'Upload Image & Detect'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadDetection}
                    disabled={isDetecting}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <h4 style={{ marginBottom: '0.75rem' }}>Detected Slot States</h4>
              <div className="table-responsive-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detectionStatus?.slots || []).map((slot) => (
                      <tr key={slot.slot_id}>
                        <td>{String(slot.slot_id).toUpperCase()}</td>
                        <td>
                          <span className={`status-badge ${slot.status ? 'occupied' : 'free'}`}>
                            {slot.status ? 'Occupied' : 'Available'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(detectionStatus?.slots || []).length === 0 && (
                      <tr>
                        <td colSpan="2" className="no-records">No detection data yet. Upload an image or place frames in backend/detection/images.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h4 style={{ margin: '1.5rem 0 0.75rem' }}>Recent Detection Runs</h4>
              <div className="table-responsive-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Run ID</th>
                      <th>Timestamp</th>
                      <th>Source</th>
                      <th>Occupied</th>
                      <th>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectionHistory.map((run) => (
                      <tr key={run.id}>
                        <td>#{run.id}</td>
                        <td>{run.timestamp ? new Date(run.timestamp).toLocaleString() : '—'}</td>
                        <td>{run.source || '—'}</td>
                        <td className="text-danger">{run.occupied_count}</td>
                        <td className="text-success">{run.available_count}</td>
                      </tr>
                    ))}
                    {detectionHistory.length === 0 && (
                      <tr>
                        <td colSpan="5" className="no-records">No detection history recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Users List */}
          {activeTab === 'users-management' && (
            <div className="table-responsive-wrapper animate-fade-in">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>DB User ID</th>
                    <th>Firebase UID</th>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td><code>{u.firebase_uid}</code></td>
                      <td>
                        <div>{u.full_name || '—'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
