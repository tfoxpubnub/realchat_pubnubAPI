# PubNub API Trial - Node.js Implementation

This project demonstrates the use of PubNub's real-time messaging API through various Node.js applications. 

## 🚀 Quick Start

### Prerequisites
- Node.js (version 10 or later)
- npm (comes with Node.js)

### Installation
```bash
# Clone or download this project
# Navigate to the project directory
cd pubnub-trial

# Install dependencies
npm install

# Run the main interactive chat application
node app.js
```

## 📁 Project Structure

```
pubnub-trial/
├── app.js                           # Main interactive chat application
├── examples/
│   ├── simple-publish-subscribe.js  # Basic pub/sub example
│   ├── presence-demo.js             # Presence tracking demonstration
│   ├── history-demo.js              # Message history features
│   └── error-handling-demo.js       # Error handling and resilience
├── package.json
└── README.md
```

## 🎯 Applications Overview

### 1. Main Chat Application (`app.js`)
An interactive real-time chat application featuring:
- ✅ Real-time messaging
- ✅ Presence tracking (see who joins/leaves)
- ✅ Message history retrieval
- ✅ Interactive commands
- ✅ Graceful error handling

**Commands:**
- `/history` - Show recent messages
- `/presence` or `/who` - Show who's online
- `/help` - Show available commands
- `quit` or `exit` - Leave the chat

### 2. Simple Publish/Subscribe (`examples/simple-publish-subscribe.js`)
Demonstrates the core PubNub functionality:
- Basic message publishing
- Message subscription
- JSON message support
- Connection status handling

### 3. Presence Demo (`examples/presence-demo.js`)
Shows advanced presence features:
- Multiple user simulation
- Join/leave notifications
- Occupancy tracking
- Real-time presence updates

### 4. History Demo (`examples/history-demo.js`)
Explores message persistence:
- Message history retrieval
- Time-based history queries
- Message metadata
- Message counting

### 5. Error Handling Demo (`examples/error-handling-demo.js`)
Demonstrates robust error handling:
- Network disconnection handling
- Automatic reconnection
- Retry logic with exponential backoff
- Comprehensive error tracking

## 🔑 PubNub Configuration

All examples use PubNub's demo keys for immediate testing:
- **Publish Key**: `demo`
- **Subscribe Key**: `demo`

## 🎮 Usage Examples

### Running the Main Chat
```bash
node app.js
```
This starts an interactive chat session where you can:
- Send messages to other users
- See when users join/leave
- View message history
- Check who's currently online

### Running Individual Examples
```bash
# Basic publish/subscribe
node examples/simple-publish-subscribe.js

# Presence tracking demo
node examples/presence-demo.js

# Message history features
node examples/history-demo.js

# Error handling demonstration
node examples/error-handling-demo.js
```
