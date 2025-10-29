const PubNub = require('pubnub');
const readline = require('readline');

// Initialize PubNub with demo keys (you can get your own from https://admin.pubnub.com)
const pubnub = new PubNub({
    publishKey: 'demo',
    subscribeKey: 'demo',
    userId: `user-${Math.random().toString(36).substr(2, 9)}`,
    // Enable presence to track who's online
    heartbeatInterval: 19
});

// Channel configuration
const CHANNEL = 'pubnub-trial-chat';
const PRESENCE_CHANNEL = `${CHANNEL}-pnpres`;

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 PubNub Trial Application Starting...');
console.log(`📡 User ID: ${pubnub.getUserId()}`);
console.log(`📢 Channel: ${CHANNEL}`);
console.log('=' .repeat(50));

// Set up message and presence listeners
pubnub.addListener({
    message: function(event) {
        const timestamp = new Date(event.timetoken / 10000).toLocaleTimeString();
        console.log(`\n[${timestamp}] ${event.publisher}: ${event.message.text}`);
        console.log('Type your message (or "quit" to exit): ');
    },
    
    presence: function(event) {
        const timestamp = new Date().toLocaleTimeString();
        switch(event.action) {
            case 'join':
                console.log(`\n✅ [${timestamp}] ${event.uuid} joined the channel`);
                break;
            case 'leave':
                console.log(`\n❌ [${timestamp}] ${event.uuid} left the channel`);
                break;
            case 'timeout':
                console.log(`\n⏰ [${timestamp}] ${event.uuid} timed out`);
                break;
        }
        console.log('Type your message (or "quit" to exit): ');
    },
    
    status: function(statusEvent) {
        if (statusEvent.category === "PNConnectedCategory") {
            console.log('✅ Connected to PubNub');
            console.log('Type your message (or "quit" to exit): ');
        } else if (statusEvent.category === "PNNetworkDownCategory") {
            console.log('❌ Network is down');
        } else if (statusEvent.category === "PNNetworkUpCategory") {
            console.log('✅ Network is back up');
        }
    }
});

// Subscribe to the channel with presence
pubnub.subscribe({
    channels: [CHANNEL],
    withPresence: true
});

// Function to publish a message
function publishMessage(text) {
    pubnub.publish({
        channel: CHANNEL,
        message: {
            text: text,
            timestamp: new Date().toISOString()
        }
    }, function(status, response) {
        if (status.error) {
            console.log('❌ Publish failed:', status.errorData);
        } else {
            console.log(`✅ Message sent! Timetoken: ${response.timetoken}`);
        }
    });
}

// Function to get message history
function getMessageHistory() {
    console.log('\n📜 Fetching message history...');
    pubnub.history({
        channel: CHANNEL,
        count: 10,
        stringifiedTimeToken: true
    }, function(status, response) {
        if (status.error) {
            console.log('❌ Failed to fetch history:', status.errorData);
        } else {
            console.log('\n--- Message History ---');
            response.messages.forEach(msg => {
                const timestamp = new Date(msg.timetoken / 10000).toLocaleTimeString();
                console.log(`[${timestamp}] ${msg.entry.text}`);
            });
            console.log('--- End History ---\n');
        }
    });
}

// Function to get who's currently online
function getPresence() {
    console.log('\n👥 Checking who\'s online...');
    pubnub.hereNow({
        channels: [CHANNEL],
        includeUUIDs: true
    }, function(status, response) {
        if (status.error) {
            console.log('❌ Failed to get presence:', status.errorData);
        } else {
            const channelData = response.channels[CHANNEL];
            console.log(`\n--- Online Users (${channelData.occupancy}) ---`);
            channelData.occupants.forEach(user => {
                console.log(`👤 ${user.uuid}`);
            });
            console.log('--- End Online Users ---\n');
        }
    });
}

// Handle user input
function handleUserInput() {
    rl.question('', (input) => {
        const command = input.trim().toLowerCase();
        
        if (command === 'quit' || command === 'exit') {
            console.log('\n👋 Goodbye!');
            pubnub.unsubscribe({
                channels: [CHANNEL]
            });
            rl.close();
            process.exit(0);
        } else if (command === '/history') {
            getMessageHistory();
            handleUserInput();
        } else if (command === '/presence' || command === '/who') {
            getPresence();
            handleUserInput();
        } else if (command === '/help') {
            console.log('\n--- Available Commands ---');
            console.log('/history - Show recent messages');
            console.log('/presence or /who - Show who\'s online');
            console.log('/help - Show this help');
            console.log('quit or exit - Leave the chat');
            console.log('--- End Commands ---\n');
            handleUserInput();
        } else if (input.trim()) {
            publishMessage(input.trim());
            handleUserInput();
        } else {
            handleUserInput();
        }
    });
}

// Start the interactive session
console.log('\n💬 Welcome to PubNub Trial Chat!');
console.log('Commands: /history, /presence, /help, quit');
handleUserInput();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    pubnub.unsubscribe({
        channels: [CHANNEL]
    });
    rl.close();
    process.exit(0);
});

