const PubNub = require('pubnub');

console.log('👥 PubNub Presence Tracking Demo');

// Create multiple users to simulate presence
const users = [];
const channel = 'presence-demo-channel';

// Create 3 simulated users
for (let i = 1; i <= 3; i++) {
    const user = new PubNub({
        publishKey: 'demo',
        subscribeKey: 'demo',
        userId: `demo-user-${i}`,
        heartbeatInterval: 19
    });
    
    user.addListener({
        presence: function(event) {
            console.log(`🔄 Presence Event: ${event.action} by ${event.uuid}`);
            console.log(`   Channel: ${event.channel}`);
            console.log(`   Occupancy: ${event.occupancy}`);
            if (event.join) console.log(`   Joined: ${event.join.join(', ')}`);
            if (event.leave) console.log(`   Left: ${event.leave.join(', ')}`);
            if (event.timeout) console.log(`   Timed out: ${event.timeout.join(', ')}`);
            console.log('---');
        },
        
        status: function(statusEvent) {
            if (statusEvent.category === "PNConnectedCategory") {
                console.log(`✅ ${this.getUserId()} connected`);
            }
        }.bind(user)
    });
    
    users.push(user);
}

// Function to get current presence
function checkPresence() {
    users[0].hereNow({
        channels: [channel],
        includeUUIDs: true,
        includeState: true
    }, function(status, response) {
        if (!status.error) {
            const channelData = response.channels[channel];
            console.log(`\n📊 Current Presence on ${channel}:`);
            console.log(`   Total occupancy: ${channelData.occupancy}`);
            console.log(`   Users online:`);
            channelData.occupants.forEach(occupant => {
                console.log(`     - ${occupant.uuid}`);
            });
            console.log('---\n');
        }
    });
}

// Demo sequence
console.log('\n🎬 Starting presence demo...\n');

// User 1 joins
setTimeout(() => {
    console.log('📥 User 1 joining...');
    users[0].subscribe({ channels: [channel], withPresence: true });
}, 1000);

// User 2 joins
setTimeout(() => {
    console.log('📥 User 2 joining...');
    users[1].subscribe({ channels: [channel], withPresence: true });
}, 3000);

// Check presence
setTimeout(() => {
    checkPresence();
}, 5000);

// User 3 joins
setTimeout(() => {
    console.log('📥 User 3 joining...');
    users[2].subscribe({ channels: [channel], withPresence: true });
}, 7000);

// Check presence again
setTimeout(() => {
    checkPresence();
}, 9000);

// User 2 leaves
setTimeout(() => {
    console.log('📤 User 2 leaving...');
    users[1].unsubscribe({ channels: [channel] });
}, 11000);

// Final presence check
setTimeout(() => {
    checkPresence();
}, 13000);

// Clean up and exit
setTimeout(() => {
    console.log('🧹 Cleaning up and exiting...');
    users.forEach(user => {
        user.unsubscribe({ channels: [channel] });
    });
    process.exit(0);
}, 15000);

