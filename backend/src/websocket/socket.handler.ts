import { Server, Socket } from 'socket.io';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    socket.on('join:team', (teamId: number) => {
      socket.join(`team_${teamId}`);
      console.log(`Socket ${socket.id} joined room team_${teamId}`);
    });

    socket.on('join:user', (userId: number) => {
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} joined room user_${userId}`);
    });

    socket.on('location:update', (data: any) => {
      // Broadcast location update to team room
      if (data.teamId) {
        socket.to(`team_${data.teamId}`).emit('location:update', data);
      }
      io.emit('location:update', data);
    });

    socket.on('chat:public', (data: any) => {
      if (data.teamId) {
        io.to(`team_${data.teamId}`).emit('chat:public', data);
      }
    });

    socket.on('chat:private', (data: any) => {
      if (data.receiverId) {
        io.to(`user_${data.receiverId}`).emit('chat:private', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });
}
