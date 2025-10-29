const PubNub = require('pubnub');

console.log('🛡️ PubNub Error Handling and Resilience Demo');

// Initialize with intentionally problematic configuration for demo
const pubnub = new PubNub({
    publishKey: 'demo',
    subscribeKey: 'demo',
    userId: `error-demo-user-${Date.now()}`,
    // Reduce heartbeat for faster timeout demo
    heartbeatInterval: 5,
    // Enable retry configuration
    restore: true,
    reconnectionPolicy: PubNub.EXPONENTIAL_POLICY
});

const channel = 'error-handling-demo';

// Comprehensive error tracking
const errorStats = {
    networkErrors: 0,
    publishErrors: 0,
    subscribeErrors: 0,
    timeouts: 0,
    reconnections: 0
};

// Enhanced listener with comprehensive error handling
pubnub.addListener({
    message: function(event) {
        console.log('✅ Message received successfully:', event.message);
    },
    
    presence: function(event) {
        if (event.action === 'timeout') {
            errorStats.timeouts++;
            console.log(`⏰ Presence timeout detected for ${event.uuid} (Total: ${errorStats.timeouts})`);
        }
    },
    
    status: function(statusEvent) {
        console.log(`📡 Status Event: ${statusEvent.category}`);
        
        switch(statusEvent.category) {
            case 'PNConnectedCategory':
                console.log('✅ Successfully connected to PubNub');
                errorStats.reconnections++;
                if (errorStats.reconnections > 1) {
                    console.log(`🔄 Reconnection #${errorStats.reconnections - 1} successful`);
                }
                break;
                
            case 'PNNetworkDownCategory':
                errorStats.networkErrors++;
                console.log(`❌ Network is down (Error #${errorStats.networkErrors})`);
                console.log('   PubNub will attempt to reconnect automatically...');
                break;
                
            case 'PNNetworkUpCategory':
                console.log('✅ Network is back up - reconnecting...');
                break;
                
            case 'PNReconnectedCategory':
                console.log('🔄 Reconnected to PubNub after network issue');
                break;
                
            case 'PNNetworkIssuesCategory':
                errorStats.networkErrors++;
                console.log(`⚠️ Network issues detected (Issue #${errorStats.networkErrors})`);
                console.log('   Affected channels:', statusEvent.affectedChannels);
                break;
                
            case 'PNAccessDeniedCategory':
                console.log('🚫 Access denied - check your publish/subscribe keys');
                break;
                
            case 'PNMalformedFilterExpressionCategory':
                console.log('❌ Malformed filter expression');
                break;
                
            case 'PNBadRequestCategory':
                console.log('❌ Bad request - check your parameters');
                break;
                
            case 'PNDecryptionErrorCategory':
                console.log('🔐 Decryption error - message may be corrupted');
                break;
                
            default:
                console.log(`ℹ️ Other status: ${statusEvent.category}`);
        }
        
        if (statusEvent.errorData) {
            console.log('   Error details:', statusEvent.errorData);
        }
    }
});

// Subscribe with error handling
console.log(`🔗 Subscribing to ${channel}...`);
pubnub.subscribe({
    channels: [channel],
    withPresence: true
});

// Function to publish with comprehensive error handling
function publishWithErrorHandling(message, attempt = 1) {
    const maxAttempts = 3;
    
    console.log(`📤 Publishing message (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(message)}`);
    
    pubnub.publish({
        channel: channel,
        message: message,
        meta: { attempt: attempt, timestamp: Date.now() }
    }, function(status, response) {
        if (status.error) {
            errorStats.publishErrors++;
            console.log(`❌ Publish failed (Error #${errorStats.publishErrors}):`, {
                category: status.category,
                operation: status.operation,
                statusCode: status.statusCode,
                errorData: status.errorData
            });
            
            // Retry logic
            if (attempt < maxAttempts) {
                const retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`🔄 Retrying in ${retryDelay}ms...`);
                setTimeout(() => {
                    publishWithErrorHandling(message, attempt + 1);
                }, retryDelay);
            } else {
                console.log('💀 Max retry attempts reached. Message failed to send.');
            }
        } else {
            console.log('✅ Message published successfully!', {
                timetoken: response.timetoken,
                attempt: attempt
            });
        }
    });
}

// Function to demonstrate history with error handling
function fetchHistoryWithErrorHandling() {
    console.log('\n📜 Fetching history with error handling...');
    
    pubnub.history({
        channel: channel,
        count: 5,
        stringifiedTimeToken: true
    }, function(status, response) {
        if (status.error) {
            console.log('❌ History fetch failed:', {
                category: status.category,
                statusCode: status.statusCode,
                errorData: status.errorData
            });
            
            // Retry after delay
            console.log('🔄 Retrying history fetch in 2 seconds...');
            setTimeout(fetchHistoryWithErrorHandling, 2000);
        } else {
            console.log(`✅ History fetched successfully (${response.messages.length} messages)`);
            response.messages.forEach((msg, index) => {
                const timestamp = new Date(msg.timetoken / 10000).toLocaleString();
                console.log(`  ${index + 1}. [${timestamp}] ${JSON.stringify(msg.entry)}`);
            });
        }
    });
}

// Demo sequence
setTimeout(() => {
    publishWithErrorHandling('Test message 1');
}, 2000);

setTimeout(() => {
    publishWithErrorHandling({ type: 'test', data: 'JSON message' });
}, 4000);

setTimeout(() => {
    fetchHistoryWithErrorHandling();
}, 6000);

// Simulate network issues by trying to publish to an invalid channel
setTimeout(() => {
    console.log('\n🧪 Testing error handling with potentially problematic operation...');
    
    // This might fail with certain PubNub configurations
    const testPubnub = new PubNub({
        publishKey: 'invalid-key',
        subscribeKey: 'invalid-key',
        userId: 'test-user'
    });
    
    testPubnub.publish({
        channel: 'test-channel',
        message: 'This should fail'
    }, function(status, response) {
        if (status.error) {
            console.log('✅ Successfully caught expected error:', status.category);
        } else {
            console.log('🤔 Unexpected success with invalid keys');
        }
    });
}, 8000);

// Print error statistics
setTimeout(() => {
    console.log('\n📊 Error Statistics Summary:');
    console.log('----------------------------');
    Object.entries(errorStats).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
    });
    console.log('----------------------------');
    
    console.log('\n✅ Error handling demo completed!');
    console.log('💡 Key takeaways:');
    console.log('   - Always handle status events in your listener');
    console.log('   - Implement retry logic for critical operations');
    console.log('   - Monitor error statistics for debugging');
    console.log('   - PubNub has built-in reconnection capabilities');
    
    // Clean up
    pubnub.unsubscribe({ channels: [channel] });
    process.exit(0);
}, 12000);

