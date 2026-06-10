function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Example: notify when a slot changes
    socket.on("slot_update", (data) => {
      io.emit("slot_update", data); // broadcast to all clients
    });

    // Example: notify when a booking is created
    socket.on("booking_created", (data) => {
      io.emit("booking_created", data);
    });
  });
}

module.exports = socketHandler;
