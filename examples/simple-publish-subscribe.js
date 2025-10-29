const PubNub = require('pubnub');

// This is a simple example showing basic publish/subscribe functionality
console.log('🔥 Simple PubNub Publish/Subscribe Example');

const pubnub = new PubNub({
    publishKey: 'demo',
    subscribeKey: 'demo',
    userId: `simple-user-${Date.now()}`
});

const channel = 'simple-test-channel';

// Set up listener for incoming messages
pubnub.addListener({
    message: function(event) {
        console.log('📨 Received message:', event.message);
        console.log('📍 From channel:', event.channel);
        console.log('👤 From user:', event.publisher);
        console.log('⏰ Timetoken:', event.timetoken);
        console.log('---');
    },
    
    status: function(statusEvent) {
        if (statusEvent.category === "PNConnectedCategory") {
            console.log('✅ Connected! Publishing test messages...');
            
            // Publish a few test messages
            setTimeout(() => {
                publishTestMessage('Hello from Node.js!');
            }, 1000);
            
            setTimeout(() => {
                publishTestMessage('This is message #2');
            }, 2000);
            
            setTimeout(() => {
                publishTestMessage({ type: 'json', data: 'You can send JSON objects too!' });
            }, 3000);
            
            // Exit after 5 seconds
            setTimeout(() => {
                console.log('👋 Example completed. Disconnecting...');
                pubnub.unsubscribe({ channels: [channel] });
                process.exit(0);
            }, 5000);
        }
    }
});

// Subscribe to the channel
console.log(`🔗 Subscribing to channel: ${channel}`);
pubnub.subscribe({
    channels: [channel]
});

// Function to publish messages
function publishTestMessage(message) {
    pubnub.publish({
        channel: channel,
        message: message
    }, function(status, response) {
        if (status.error) {
            console.log('❌ Publish error:', status);
        } else {
            console.log('✅ Message published successfully');
        }
    });
}

