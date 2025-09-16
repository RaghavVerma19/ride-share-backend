// WebSocket message handlers
export function handleConnection(ws, req) {
  console.log('New WebSocket connection');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection_established',
    message: 'Successfully connected to WebSocket server',
    timestamp: Date.now()
  }));

  // Handle ping/pong for connection keep-alive
  const interval = setInterval(() => {
    if (ws.readyState === 1) { // 1 = OPEN
      ws.ping();
    } else {
      clearInterval(interval);
    }
  }, 30000); // Send ping every 30 seconds

  ws.on('pong', () => {
    // Connection is still alive
    console.log('Received pong from client');
  });
}

// Export all handlers
export default {
  handleConnection
};
