import { WebSocketServer } from 'ws';
import { handleConnection } from './wsHandlers.js';

export function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });
  
  // Store active connections
  const clients = new Map();

  wss.on('connection', (ws, request) => {
    // Extract user ID from the URL or headers (you'll need to implement this based on your auth)
    const userId = request.url?.split('?userId=')[1];
    
    if (!userId) {
      ws.close(4001, 'User ID is required');
      return;
    }

    // Store the WebSocket connection with the user ID
    clients.set(userId, ws);
    console.log(`User ${userId} connected`);

    // Handle incoming messages
    ws.on('message', (message) => {
      handleMessage(ws, message, clients);
    });

    // Handle disconnection
    ws.on('close', () => {
      clients.delete(userId);
      console.log(`User ${userId} disconnected`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(userId);
      ws.terminate();
    });
  });

  return wss;
}

async function handleMessage(ws, message, clients) {
  try {
    const data = JSON.parse(message);
    
    // Handle different types of messages
    switch (data.type) {
      case 'message':
        await handleChatMessage(data, clients);
        break;
      case 'typing':
        await handleTypingStatus(data, clients);
        break;
      // Add more message types as needed
      default:
        console.warn('Unknown message type:', data.type);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  } catch (error) {
    console.error('Error handling message:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid message format'
    }));
  }
}

async function handleChatMessage(data, clients) {
  const { from, to, content, timestamp } = data;
  
  // Here you would typically save the message to your database
  // const message = await saveMessageToDB({ from, to, content, timestamp });
  
  // Forward the message to the recipient if they're online
  const recipientWs = clients.get(to);
  if (recipientWs && recipientWs.readyState === 1) { // 1 = OPEN
    recipientWs.send(JSON.stringify({
      type: 'message',
      from,
      content,
      timestamp: timestamp || Date.now()
    }));
  }
  
  // Send delivery confirmation to the sender
  const senderWs = clients.get(from);
  if (senderWs && senderWs.readyState === 1) {
    senderWs.send(JSON.stringify({
      type: 'message_delivered',
      messageId: data.messageId,
      timestamp: Date.now()
    }));
  }
}

async function handleTypingStatus(data, clients) {
  const { from, to, isTyping } = data;
  
  // Forward typing status to the recipient
  const recipientWs = clients.get(to);
  if (recipientWs && recipientWs.readyState === 1) {
    recipientWs.send(JSON.stringify({
      type: 'typing',
      from,
      isTyping
    }));
  }
}
