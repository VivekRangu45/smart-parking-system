import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import "./AdminDashboard.css";


function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
  const socket = io("http://localhost:5000");

  axios.get("http://localhost:5000/api/bookings/all")
    .then(res => setBookings(res.data))
    .catch(err => console.error(err));

  axios.get("http://localhost:5000/api/analytics/occupancy")
    .then(res => setOccupancy(res.data))
    .catch(err => console.error(err));

  axios.get("http://localhost:5000/api/analytics/revenue")
    .then(res => setRevenue(res.data.total_revenue))
    .catch(err => console.error(err));

  socket.on("booking_created", (data) => {
    setBookings(prev => [data, ...prev]);
  });

  return () => {
    socket.off("booking_created");
    socket.disconnect();
  };
}, []);

  // ✅ Chart.js data for occupancy
  const occupancyData = {
    labels: occupancy.map(o => o.zone_name),
    datasets: [
      {
        label: "Occupied Slots",
        data: occupancy.map(o => o.occupied_slots),
        backgroundColor: "rgba(75,192,192,0.6)"
      },
      {
        label: "Total Slots",
        data: occupancy.map(o => o.total_slots),
        backgroundColor: "rgba(153,102,255,0.6)"
      }
    ]
  };

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>

      {/* Bookings Section */}
      <div className="card">
        <h3>Bookings</h3>
        <ul>
          {bookings.map((b) => (
            <li key={b.id}>
              {`Booking ${b.id} → Slot ${b.slot_id} → Status ${b.status}`}
            </li>
          ))}
        </ul>
      </div>

      {/* Occupancy Section */}
      <div className="card">
        <h3>Occupancy Report</h3>
        <Bar data={occupancyData} />
      </div>

      {/* Revenue Section */}
      <div className="card">
        <h3>Total Revenue</h3>
        <p>{`₹${revenue}`}</p>
      </div>
    </div>
  );
}

export default AdminDashboard;
