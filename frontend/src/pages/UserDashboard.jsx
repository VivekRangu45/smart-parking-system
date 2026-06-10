import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import "./UserDashboard.css";



function UserDashboard() {
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  useEffect(() => {
  const socket = io("http://localhost:5000");

  axios.get("http://localhost:5000/api/slots")
    .then(res => setSlots(res.data))
    .catch(err => console.error(err));

  socket.on("slot_update", (data) => {
    setSlots(prev =>
      prev.map(s =>
        s.id === data.slot_id ? { ...s, is_occupied: data.status } : s
      )
    );
  });

  return () => {
    socket.off("slot_update");
    socket.disconnect();
  };
}, []);

  // ✅ Booking + Payment flow
  const handleBookingAndPayment = async (slotId) => {
    try {
      // Step 1: Create booking
      const bookingRes = await axios.post("http://localhost:5000/api/bookings", {
        user_id: 1,   // replace with actual logged-in user
        zone_id: 1,   // replace with selected zone
        slot_id: slotId
      });

      const booking = bookingRes.data.booking;
      console.log("Booking created:", booking);

      // Step 2: Process payment
      const paymentRes = await axios.post("http://localhost:5000/api/payments", {
        booking_id: booking.id,
        amount: 50.00 // example amount
      });

      console.log("Payment success:", paymentRes.data);

    } catch (err) {
      console.error("Error in booking/payment flow:", err);
    }
  };

  return (
    <div className="user-dashboard">
      <h2>User Dashboard</h2>

      {/* Booking Form */}
      <form onSubmit={(e) => {
        e.preventDefault();
        if (selectedSlotId) handleBookingAndPayment(selectedSlotId);
      }}>
        <select onChange={(e) => setSelectedSlotId(e.target.value)}>
          <option value="">Select a free slot</option>
          {slots.filter(s => !s.is_occupied).map(s => (
            <option key={s.id} value={s.id}>
              {`Slot ${s.slot_number} (Zone ${s.zone_id})`}
            </option>
          ))}
        </select>
        <button type="submit">Book & Pay</button>
      </form>

      {/* Slot List */}
      <ul>
        {slots.map((s) => (
          <li key={s.id}>
            {`Slot ${s.slot_number} → ${s.is_occupied ? "Occupied" : "Free"}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserDashboard;
