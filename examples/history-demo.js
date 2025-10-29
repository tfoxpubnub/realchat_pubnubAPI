const PubNub = require('pubnub');

console.log('📜 PubNub Message History Demo');

const pubnub = new PubNub({
    publishKey: 'demo',
    subscribeKey: 'demo',
    userId: `history-demo-user-${Date.now()}`
});

const channel = 'history-demo-channel';

// Function to publish sample messages
async function publishSampleMessages() {
    console.log('📝 Publishing sample messages for history demo...');
    
    const messages = [
        'First message for history demo',
        'Second message with timestamp',
        'Third message - testing history',
        { type: 'json', content: 'JSON message in history' },
        'Final message for the demo'
    ];
    
    for (let i = 0; i < messages.length; i++) {
        await new Promise((resolve) => {
            pubnub.publish({
                channel: channel,
                message: messages[i],
                meta: { messageIndex: i + 1 }
            }, function(status, response) {
                if (status.error) {
                    console.log(`❌ Failed to publish message ${i + 1}:`, status);
                } else {
                    console.log(`✅ Published message ${i + 1}, timetoken: ${response.timetoken}`);
                }
                resolve();
            });
        });
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Function to fetch and display history
function fetchHistory(count = 10) {
    console.log(`\n📖 Fetching last ${count} messages from history...`);
    
    pubnub.history({
        channel: channel,
        count: count,
        stringifiedTimeToken: true,
        includeMeta: true
    }, function(status, response) {
        if (status.error) {
            console.log('❌ Error fetching history:', status);
            return;
        }
        
        console.log(`\n--- Message History (${response.messages.length} messages) ---`);
        response.messages.forEach((msg, index) => {
            const date = new Date(msg.timetoken / 10000);
            const timestamp = date.toLocaleString();
            const meta = msg.meta ? ` [Meta: ${JSON.stringify(msg.meta)}]` : '';
            
            console.log(`${index + 1}. [${timestamp}] ${typeof msg.entry === 'object' ? JSON.stringify(msg.entry) : msg.entry}${meta}`);
        });
        console.log('--- End History ---\n');
        
        // Demonstrate time-based history retrieval
        if (response.messages.length > 0) {
            demonstrateTimeBasedHistory(response.messages);
        }
    });
}

// Function to demonstrate fetching history between specific times
function demonstrateTimeBasedHistory(messages) {
    if (messages.length < 3) return;
    
    console.log('⏰ Demonstrating time-based history retrieval...');
    
    // Get messages between the 2nd and 4th message timestamps
    const startTime = messages[1].timetoken;
    const endTime = messages[Math.min(3, messages.length - 1)].timetoken;
    
    pubnub.history({
        channel: channel,
        start: startTime,
        end: endTime,
        count: 10,
        stringifiedTimeToken: true
    }, function(status, response) {
        if (status.error) {
            console.log('❌ Error fetching time-based history:', status);
            return;
        }
        
        console.log('\n--- Time-Based History ---');
        console.log(`From: ${new Date(startTime / 10000).toLocaleString()}`);
        console.log(`To: ${new Date(endTime / 10000).toLocaleString()}`);
        response.messages.forEach((msg, index) => {
            const timestamp = new Date(msg.timetoken / 10000).toLocaleString();
            console.log(`${index + 1}. [${timestamp}] ${typeof msg.entry === 'object' ? JSON.stringify(msg.entry) : msg.entry}`);
        });
        console.log('--- End Time-Based History ---\n');
        
        demonstrateMessageCounts();
    });
}

// Function to demonstrate message counts
function demonstrateMessageCounts() {
    console.log('🔢 Getting message count for the channel...');
    
    // Get count of messages since a specific time (1 hour ago)
    const oneHourAgo = (Date.now() - 3600000) * 10000; // Convert to PubNub timetoken format
    
    pubnub.messageCounts({
        channels: [channel],
        channelsTimetoken: [oneHourAgo.toString()]
    }, function(status, response) {
        if (status.error) {
            console.log('❌ Error getting message counts:', status);
        } else {
            console.log(`📊 Messages in ${channel} since 1 hour ago: ${response.channels[channel]}`);
        }
        
        console.log('\n✅ History demo completed!');
        process.exit(0);
    });
}

// Run the demo
async function runDemo() {
    try {
        await publishSampleMessages();
        
        // Wait a moment for messages to be stored
        setTimeout(() => {
            fetchHistory(10);
        }, 2000);
        
    } catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}

runDemo();

