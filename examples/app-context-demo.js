const PubNub = require('pubnub');

/**
 * PubNub App Context (Objects) Demo
 * 
 * This example demonstrates:
 * - User (UUID) metadata management
 * - Channel metadata management
 * - Memberships (user-channel relationships)
 * - Real-time updates for metadata changes
 */

// Initialize PubNub
const pubnub = new PubNub({
    publishKey: 'demo',
    subscribeKey: 'demo',
    userId: `user-${Math.random().toString(36).substr(2, 9)}`
});

console.log('🚀 PubNub App Context Demo Starting...');
console.log(`📡 User ID: ${pubnub.getUserId()}`);
console.log('=' .repeat(50));

// ============================================
// USER (UUID) METADATA MANAGEMENT
// ============================================

function setUserMetadata() {
    console.log('\n📝 Setting User Metadata...');
    
    pubnub.objects.setUUIDMetadata({
        uuid: pubnub.getUserId(),
        data: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            profileUrl: 'https://ui-avatars.com/api/?name=John+Doe',
            custom: {
                role: 'developer',
                department: 'Engineering',
                joinedAt: new Date().toISOString(),
                preferences: {
                    theme: 'dark',
                    notifications: true
                }
            }
        }
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ User metadata set successfully:');
            console.log(JSON.stringify(response.data, null, 2));
        } else {
            console.error('❌ Error setting user metadata:', status);
        }
    });
}

function getUserMetadata(userId) {
    console.log(`\n📖 Getting User Metadata for: ${userId}`);
    
    pubnub.objects.getUUIDMetadata({
        uuid: userId
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ User metadata retrieved:');
            console.log(JSON.stringify(response.data, null, 2));
        } else {
            console.error('❌ Error getting user metadata:', status);
        }
    });
}

function getAllUsers() {
    console.log('\n👥 Getting All Users...');
    
    pubnub.objects.getAllUUIDMetadata({
        include: {
            customFields: true
        },
        limit: 100
    }, function(status, response) {
        if (!status.error) {
            console.log(`✅ Found ${response.data.length} users:`);
            response.data.forEach(user => {
                console.log(`  - ${user.name} (${user.id})`);
            });
        } else {
            console.error('❌ Error getting users:', status);
        }
    });
}

function updateUserMetadata() {
    console.log('\n🔄 Updating User Metadata...');
    
    pubnub.objects.setUUIDMetadata({
        uuid: pubnub.getUserId(),
        data: {
            custom: {
                lastActive: new Date().toISOString(),
                status: 'online'
            }
        }
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ User metadata updated successfully');
        } else {
            console.error('❌ Error updating user metadata:', status);
        }
    });
}

// ============================================
// CHANNEL METADATA MANAGEMENT
// ============================================

function setChannelMetadata(channelId) {
    console.log(`\n📝 Setting Channel Metadata for: ${channelId}`);
    
    pubnub.objects.setChannelMetadata({
        channel: channelId,
        data: {
            name: 'Engineering Team Chat',
            description: 'Main channel for engineering team discussions',
            custom: {
                category: 'team',
                department: 'Engineering',
                createdAt: new Date().toISOString(),
                settings: {
                    public: false,
                    moderated: true,
                    maxMembers: 50
                }
            }
        }
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ Channel metadata set successfully:');
            console.log(JSON.stringify(response.data, null, 2));
        } else {
            console.error('❌ Error setting channel metadata:', status);
        }
    });
}

function getChannelMetadata(channelId) {
    console.log(`\n📖 Getting Channel Metadata for: ${channelId}`);
    
    pubnub.objects.getChannelMetadata({
        channel: channelId,
        include: {
            customFields: true
        }
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ Channel metadata retrieved:');
            console.log(JSON.stringify(response.data, null, 2));
        } else {
            console.error('❌ Error getting channel metadata:', status);
        }
    });
}

function getAllChannels() {
    console.log('\n📺 Getting All Channels...');
    
    pubnub.objects.getAllChannelMetadata({
        include: {
            customFields: true
        },
        limit: 100
    }, function(status, response) {
        if (!status.error) {
            console.log(`✅ Found ${response.data.length} channels:`);
            response.data.forEach(channel => {
                console.log(`  - ${channel.name} (${channel.id})`);
            });
        } else {
            console.error('❌ Error getting channels:', status);
        }
    });
}

// ============================================
// MEMBERSHIPS (USER-CHANNEL RELATIONSHIPS)
// ============================================

function addMembership(channelId) {
    console.log(`\n➕ Adding membership to channel: ${channelId}`);
    
    pubnub.objects.setMemberships({
        uuid: pubnub.getUserId(),
        channels: [{
            id: channelId,
            custom: {
                role: 'member',
                joinedAt: new Date().toISOString(),
                notifications: true
            }
        }]
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ Membership added successfully:');
            console.log(JSON.stringify(response.data, null, 2));
        } else {
            console.error('❌ Error adding membership:', status);
        }
    });
}

function getUserMemberships() {
    console.log('\n📋 Getting User Memberships...');
    
    pubnub.objects.getMemberships({
        uuid: pubnub.getUserId(),
        include: {
            customFields: true,
            channelFields: true
        }
    }, function(status, response) {
        if (!status.error) {
            console.log(`✅ User is member of ${response.data.length} channels:`);
            response.data.forEach(membership => {
                console.log(`  - ${membership.channel.name} (${membership.channel.id})`);
                if (membership.custom) {
                    console.log(`    Role: ${membership.custom.role}`);
                }
            });
        } else {
            console.error('❌ Error getting memberships:', status);
        }
    });
}

function getChannelMembers(channelId) {
    console.log(`\n👥 Getting Channel Members for: ${channelId}`);
    
    pubnub.objects.getChannelMembers({
        channel: channelId,
        include: {
            customFields: true,
            UUIDFields: true
        }
    }, function(status, response) {
        if (!status.error) {
            console.log(`✅ Channel has ${response.data.length} members:`);
            response.data.forEach(member => {
                console.log(`  - ${member.uuid.name} (${member.uuid.id})`);
                if (member.custom) {
                    console.log(`    Role: ${member.custom.role}`);
                }
            });
        } else {
            console.error('❌ Error getting channel members:', status);
        }
    });
}

function removeMembership(channelId) {
    console.log(`\n➖ Removing membership from channel: ${channelId}`);
    
    pubnub.objects.removeMemberships({
        uuid: pubnub.getUserId(),
        channels: [channelId]
    }, function(status, response) {
        if (!status.error) {
            console.log('✅ Membership removed successfully');
        } else {
            console.error('❌ Error removing membership:', status);
        }
    });
}

// ============================================
// LISTENING FOR METADATA CHANGES
// ============================================

function setupObjectsListener() {
    console.log('\n👂 Setting up Objects event listener...');
    
    pubnub.addListener({
        objects: function(event) {
            console.log('\n🔔 Objects Event Received:');
            console.log(`Type: ${event.message.type}`);
            console.log(`Event: ${event.message.event}`);
            
            switch (event.message.type) {
                case 'uuid':
                    console.log('User metadata changed:');
                    console.log(`  User: ${event.message.data.name} (${event.message.data.id})`);
                    break;
                    
                case 'channel':
                    console.log('Channel metadata changed:');
                    console.log(`  Channel: ${event.message.data.name} (${event.message.data.id})`);
                    break;
                    
                case 'membership':
                    console.log('Membership changed:');
                    console.log(`  User: ${event.message.data.uuid.id}`);
                    console.log(`  Channel: ${event.message.data.channel.id}`);
                    break;
            }
        }
    });
    
    console.log('✅ Objects listener registered');
}

// ============================================
// DEMO EXECUTION
// ============================================

async function runDemo() {
    const channelId = 'engineering-team';
    
    console.log('\n🎬 Starting App Context Demo...\n');
    
    // Setup listener first
    setupObjectsListener();
    
    // Wait a bit for setup
    await sleep(1000);
    
    // User metadata operations
    setUserMetadata();
    await sleep(2000);
    
    getUserMetadata(pubnub.getUserId());
    await sleep(2000);
    
    updateUserMetadata();
    await sleep(2000);
    
    // Channel metadata operations
    setChannelMetadata(channelId);
    await sleep(2000);
    
    getChannelMetadata(channelId);
    await sleep(2000);
    
    // Membership operations
    addMembership(channelId);
    await sleep(2000);
    
    getUserMemberships();
    await sleep(2000);
    
    getChannelMembers(channelId);
    await sleep(2000);
    
    // List all users and channels
    getAllUsers();
    await sleep(2000);
    
    getAllChannels();
    await sleep(2000);
    
    console.log('\n✅ Demo completed!');
    console.log('\n💡 Key Takeaways:');
    console.log('  1. App Context provides rich metadata for users and channels');
    console.log('  2. Memberships link users to channels with custom data');
    console.log('  3. Real-time events notify about metadata changes');
    console.log('  4. Perfect for building user profiles and channel directories');
    
    process.exit(0);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
runDemo().catch(console.error);

