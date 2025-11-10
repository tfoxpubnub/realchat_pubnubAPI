const PubNub = require('pubnub');

/**
 * PubNub Message Actions Demo
 * 
 * This example demonstrates:
 * - Adding reactions to messages (emojis, likes, etc.)
 * - Removing message actions
 * - Fetching message actions
 * - Real-time message action events
 */

// Initialize PubNub
const pubnub = new PubNub({
    publishKey: 'demo',
    subscribeKey: 'demo',
    userId: `user-${Math.random().toString(36).substr(2, 9)}`
});

const CHANNEL = 'message-actions-demo';

console.log('🚀 PubNub Message Actions Demo Starting...');
console.log(`📡 User ID: ${pubnub.getUserId()}`);
console.log(`📢 Channel: ${CHANNEL}`);
console.log('=' .repeat(50));

// Store message timetokens for demo
let messageTimetoken = null;

// ============================================
// MESSAGE ACTIONS
// ============================================

function publishMessage(text, callback) {
    console.log(`\n📤 Publishing message: "${text}"`);
    
    pubnub.publish({
        channel: CHANNEL,
        message: {
            text: text,
            sender: pubnub.getUserId(),
            timestamp: new Date().toISOString()
        }
    }, function(status, response) {
        if (!status.error) {
            console.log(`✅ Message published with timetoken: ${response.timetoken}`);
            messageTimetoken = response.timetoken;
            if (callback) callback(response.timetoken);
        } else {
            console.error('❌ Error publishing message:', status);
        }
    });
}

function addReaction(messageTimetoken, emoji) {
    console.log(`\n👍 Adding reaction "${emoji}" to message ${messageTimetoken}`);
    
    pubnub.addMessageAction({
        channel: CHANNEL,
        messageTimetoken: messageTimetoken,
        action: {
            type: 'reaction',
            value: emoji
        }
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ Reaction added successfully:');
            console.log(`  Action Timetoken: ${response.data.actionTimetoken}`);
            console.log(`  Type: ${response.data.type}`);
            console.log(`  Value: ${response.data.value}`);
            console.log(`  User: ${response.data.uuid}`);
        } else {
            console.error('❌ Error adding reaction:', status);
        }
    });
}

function addReply(messageTimetoken, replyText) {
    console.log(`\n💬 Adding reply to message ${messageTimetoken}`);
    
    pubnub.addMessageAction({
        channel: CHANNEL,
        messageTimetoken: messageTimetoken,
        action: {
            type: 'reply',
            value: replyText
        }
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ Reply added successfully');
        } else {
            console.error('❌ Error adding reply:', status);
        }
    });
}

function addCustomAction(messageTimetoken, actionType, value) {
    console.log(`\n⚡ Adding custom action "${actionType}" to message`);
    
    pubnub.addMessageAction({
        channel: CHANNEL,
        messageTimetoken: messageTimetoken,
        action: {
            type: actionType,
            value: value
        }
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ Custom action added successfully');
        } else {
            console.error('❌ Error adding custom action:', status);
        }
    });
}

function getMessageActions(messageTimetoken) {
    console.log(`\n📖 Getting actions for message ${messageTimetoken}`);
    
    pubnub.getMessageActions({
        channel: CHANNEL,
        start: messageTimetoken,
        end: messageTimetoken
    }, function(status, response) {
        if (!status.error) {
            console.log(`✅ Found ${response.data.length} actions:`);
            
            // Group actions by type
            const actionsByType = {};
            response.data.forEach(action => {
                if (!actionsByType[action.type]) {
                    actionsByType[action.type] = [];
                }
                actionsByType[action.type].push(action);
            });
            
            // Display grouped actions
            Object.keys(actionsByType).forEach(type => {
                console.log(`\n  ${type}:`);
                actionsByType[type].forEach(action => {
                    console.log(`    - ${action.value} (by ${action.uuid})`);
                });
            });
        } else {
            console.error('❌ Error getting message actions:', status);
        }
    });
}

function removeMessageAction(messageTimetoken, actionTimetoken) {
    console.log(`\n🗑️ Removing action ${actionTimetoken} from message ${messageTimetoken}`);
    
    pubnub.removeMessageAction({
        channel: CHANNEL,
        messageTimetoken: messageTimetoken,
        actionTimetoken: actionTimetoken
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ Action removed successfully');
        } else {
            console.error('❌ Error removing action:', status);
        }
    });
}

function getMessagesWithActions() {
    console.log('\n📜 Fetching messages with their actions...');
    
    pubnub.fetchMessages({
        channels: [CHANNEL],
        count: 10,
        includeMessageActions: true
    }, function(status, response) {
        if (!status.error) {
            const messages = response.channels[CHANNEL];
            console.log(`✅ Found ${messages.length} messages with actions:`);
            
            messages.forEach(msg => {
                console.log(`\n  Message: "${msg.message.text}"`);
                console.log(`  Timetoken: ${msg.timetoken}`);
                
                if (msg.actions) {
                    Object.keys(msg.actions).forEach(actionType => {
                        console.log(`    ${actionType}:`);
                        Object.keys(msg.actions[actionType]).forEach(value => {
                            const actions = msg.actions[actionType][value];
                            console.log(`      ${value} (${actions.length})`);
                        });
                    });
                } else {
                    console.log('    No actions');
                }
            });
        } else {
            console.error('❌ Error fetching messages:', status);
        }
    });
}

// ============================================
// MESSAGE ACTION EVENTS
// ============================================

function setupMessageActionListener() {
    console.log('\n👂 Setting up Message Action listener...');
    
    pubnub.addListener({
        messageAction: function(event) {
            console.log('\n🔔 Message Action Event Received:');
            console.log(`Event: ${event.event}`);
            console.log(`Channel: ${event.channel}`);
            console.log(`Action Type: ${event.data.type}`);
            console.log(`Action Value: ${event.data.value}`);
            console.log(`User: ${event.data.uuid}`);
            console.log(`Message Timetoken: ${event.data.messageTimetoken}`);
            
            // Display emoji for reactions
            if (event.data.type === 'reaction') {
                if (event.event === 'added') {
                    console.log(`👍 ${event.data.uuid} reacted with ${event.data.value}`);
                } else if (event.event === 'removed') {
                    console.log(`👎 ${event.data.uuid} removed their ${event.data.value} reaction`);
                }
            }
        },
        message: function(event) {
            console.log(`\n💬 New message: "${event.message.text}"`);
        }
    });
    
    // Subscribe to channel
    pubnub.subscribe({
        channels: [CHANNEL],
        withPresence: false
    });
    
    console.log('✅ Message action listener registered');
}

// ============================================
// REACTION AGGREGATION HELPER
// ============================================

function aggregateReactions(messages) {
    console.log('\n📊 Reaction Summary:');
    
    messages.forEach(msg => {
        if (msg.actions && msg.actions.reaction) {
            console.log(`\nMessage: "${msg.message.text}"`);
            
            Object.keys(msg.actions.reaction).forEach(emoji => {
                const count = msg.actions.reaction[emoji].length;
                const users = msg.actions.reaction[emoji].map(a => a.uuid).join(', ');
                console.log(`  ${emoji} × ${count} (${users})`);
            });
        }
    });
}

// ============================================
// DEMO EXECUTION
// ============================================

async function runDemo() {
    console.log('\n🎬 Starting Message Actions Demo...\n');
    
    // Setup listener first
    setupMessageActionListener();
    await sleep(2000);
    
    // Publish a message
    publishMessage('Hello, this is a test message!', async function(timetoken) {
        await sleep(2000);
        
        // Add various reactions
        addReaction(timetoken, '👍');
        await sleep(1500);
        
        addReaction(timetoken, '❤️');
        await sleep(1500);
        
        addReaction(timetoken, '😂');
        await sleep(1500);
        
        // Add a reply
        addReply(timetoken, 'Great message!');
        await sleep(1500);
        
        // Add custom actions
        addCustomAction(timetoken, 'bookmark', 'true');
        await sleep(1500);
        
        addCustomAction(timetoken, 'flag', 'important');
        await sleep(1500);
        
        // Get all actions for this message
        getMessageActions(timetoken);
        await sleep(2000);
        
        // Fetch messages with actions
        getMessagesWithActions();
        await sleep(2000);
        
        console.log('\n✅ Demo completed!');
        console.log('\n💡 Key Takeaways:');
        console.log('  1. Message Actions enable reactions, replies, and custom actions');
        console.log('  2. Actions are indexed by message timetoken');
        console.log('  3. Real-time events notify about action changes');
        console.log('  4. Perfect for building interactive chat features');
        console.log('  5. Actions can be aggregated to show popular reactions');
        
        process.exit(0);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
runDemo().catch(console.error);

