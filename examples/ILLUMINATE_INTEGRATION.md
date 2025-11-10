# PubNub Illuminate - Analytics & Insights Guide

PubNub Illuminate provides real-time analytics and insights into your PubNub traffic, helping you understand usage patterns, performance, and user behavior.

## 📋 Overview

**PubNub Illuminate** is an analytics and monitoring platform that provides:
- Real-time traffic analytics
- Message volume tracking
- User activity insights
- Channel performance metrics
- Geographic distribution data
- Historical trend analysis

## 🎯 Key Features

### 1. Message Analytics
- Total messages sent/received
- Messages per second (MPS) tracking
- Peak traffic identification
- Message size distribution

### 2. Channel Analytics
- Most active channels
- Channel message volume
- Unique subscribers per channel
- Channel growth trends

### 3. User Analytics
- Active user counts
- User session duration
- Messages per user
- Geographic distribution

### 4. Performance Metrics
- Message delivery latency
- Connection success rates
- Error rates
- Network performance

## 🔧 Integration Methods

### 1. PubNub Admin Portal

Access Illuminate directly through your PubNub Admin Portal:

1. Log into [PubNub Admin Portal](https://admin.pubnub.com)
2. Navigate to Analytics > Illuminate
3. Select date range and metrics
4. View real-time dashboards

### 2. Illuminate REST API

Query analytics data programmatically:

```javascript
const https = require('https');

const PUBNUB_SUBSCRIBE_KEY = 'your-subscribe-key';
const PUBNUB_SECRET_KEY = 'your-secret-key';

async function getIlluminateData(startTime, endTime) {
    const options = {
        hostname: 'ps.pndsn.com',
        path: `/v1/history/sub-key/${PUBNUB_SUBSCRIBE_KEY}/messages`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${PUBNUB_SECRET_KEY}`,
            'Content-Type': 'application/json'
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}
```

### 3. Custom Analytics Collection

Implement custom analytics tracking in your application:

```javascript
class PubNubAnalytics {
    constructor(pubnub) {
        this.pubnub = pubnub;
        this.analytics = {
            messagesSent: 0,
            messagesReceived: 0,
            activeUsers: new Set(),
            channelActivity: {},
            sessionStart: Date.now()
        };
        
        this.initializeTracking();
    }
    
    initializeTracking() {
        // Track outgoing messages
        const originalPublish = this.pubnub.publish.bind(this.pubnub);
        this.pubnub.publish = (params, callback) => {
            this.trackPublish(params);
            return originalPublish(params, callback);
        };
        
        // Track incoming messages
        this.pubnub.addListener({
            message: (event) => {
                this.trackMessage(event);
            },
            presence: (event) => {
                this.trackPresence(event);
            }
        });
    }
    
    trackPublish(params) {
        this.analytics.messagesSent++;
        
        const channel = params.channel;
        if (!this.analytics.channelActivity[channel]) {
            this.analytics.channelActivity[channel] = {
                sent: 0,
                received: 0,
                users: new Set()
            };
        }
        this.analytics.channelActivity[channel].sent++;
        
        console.log('📊 Analytics - Message Sent:', {
            channel,
            totalSent: this.analytics.messagesSent
        });
    }
    
    trackMessage(event) {
        this.analytics.messagesReceived++;
        
        const channel = event.channel;
        if (!this.analytics.channelActivity[channel]) {
            this.analytics.channelActivity[channel] = {
                sent: 0,
                received: 0,
                users: new Set()
            };
        }
        this.analytics.channelActivity[channel].received++;
        
        // Track unique users
        if (event.publisher) {
            this.analytics.activeUsers.add(event.publisher);
            this.analytics.channelActivity[channel].users.add(event.publisher);
        }
        
        console.log('📊 Analytics - Message Received:', {
            channel,
            totalReceived: this.analytics.messagesReceived,
            activeUsers: this.analytics.activeUsers.size
        });
    }
    
    trackPresence(event) {
        if (event.action === 'join') {
            this.analytics.activeUsers.add(event.uuid);
        } else if (event.action === 'leave' || event.action === 'timeout') {
            this.analytics.activeUsers.delete(event.uuid);
        }
        
        console.log('📊 Analytics - Presence Update:', {
            action: event.action,
            activeUsers: this.analytics.activeUsers.size
        });
    }
    
    getAnalytics() {
        const sessionDuration = Date.now() - this.analytics.sessionStart;
        
        return {
            summary: {
                messagesSent: this.analytics.messagesSent,
                messagesReceived: this.analytics.messagesReceived,
                activeUsers: this.analytics.activeUsers.size,
                sessionDuration: Math.floor(sessionDuration / 1000) + ' seconds'
            },
            channels: Object.keys(this.analytics.channelActivity).map(channel => ({
                channel,
                sent: this.analytics.channelActivity[channel].sent,
                received: this.analytics.channelActivity[channel].received,
                uniqueUsers: this.analytics.channelActivity[channel].users.size
            })),
            messagesPerMinute: (this.analytics.messagesSent / (sessionDuration / 60000)).toFixed(2)
        };
    }
    
    logAnalytics() {
        console.log('\n📊 === PubNub Analytics Report ===');
        const report = this.getAnalytics();
        console.log('\nSummary:');
        console.log('  Messages Sent:', report.summary.messagesSent);
        console.log('  Messages Received:', report.summary.messagesReceived);
        console.log('  Active Users:', report.summary.activeUsers);
        console.log('  Session Duration:', report.summary.sessionDuration);
        console.log('  Messages/Min:', report.messagesPerMinute);
        
        console.log('\nChannel Activity:');
        report.channels.forEach(ch => {
            console.log(`  ${ch.channel}:`);
            console.log(`    Sent: ${ch.sent}, Received: ${ch.received}, Users: ${ch.uniqueUsers}`);
        });
        console.log('\n================================\n');
    }
}

// Usage
const pubnub = new PubNub({
    publishKey: 'your-pub-key',
    subscribeKey: 'your-sub-key',
    userId: 'user-123'
});

const analytics = new PubNubAnalytics(pubnub);

// Log analytics every 60 seconds
setInterval(() => {
    analytics.logAnalytics();
}, 60000);
```

## 📊 Common Analytics Queries

### 1. Message Volume Tracking

```javascript
class MessageVolumeTracker {
    constructor() {
        this.intervals = {
            minute: [],
            hour: [],
            day: []
        };
        this.currentMinute = { count: 0, timestamp: Date.now() };
    }
    
    trackMessage() {
        this.currentMinute.count++;
        
        // Roll over to new minute
        const now = Date.now();
        if (now - this.currentMinute.timestamp >= 60000) {
            this.intervals.minute.push({
                count: this.currentMinute.count,
                timestamp: this.currentMinute.timestamp
            });
            
            // Keep only last 60 minutes
            if (this.intervals.minute.length > 60) {
                this.intervals.minute.shift();
            }
            
            this.currentMinute = { count: 0, timestamp: now };
        }
    }
    
    getMessagesPerSecond() {
        if (this.intervals.minute.length === 0) return 0;
        
        const recentMinutes = this.intervals.minute.slice(-5); // Last 5 minutes
        const totalMessages = recentMinutes.reduce((sum, min) => sum + min.count, 0);
        return (totalMessages / (recentMinutes.length * 60)).toFixed(2);
    }
    
    getPeakTraffic() {
        if (this.intervals.minute.length === 0) return null;
        
        const peak = this.intervals.minute.reduce((max, min) => 
            min.count > max.count ? min : max
        );
        
        return {
            count: peak.count,
            timestamp: new Date(peak.timestamp).toISOString()
        };
    }
}
```

### 2. User Activity Tracking

```javascript
class UserActivityTracker {
    constructor() {
        this.users = new Map();
    }
    
    trackUserActivity(userId, activity) {
        if (!this.users.has(userId)) {
            this.users.set(userId, {
                messageCount: 0,
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                channels: new Set()
            });
        }
        
        const user = this.users.get(userId);
        user.messageCount++;
        user.lastSeen = Date.now();
        
        if (activity.channel) {
            user.channels.add(activity.channel);
        }
    }
    
    getActiveUsers(timeWindowMinutes = 5) {
        const cutoff = Date.now() - (timeWindowMinutes * 60000);
        let activeCount = 0;
        
        for (const [userId, data] of this.users) {
            if (data.lastSeen >= cutoff) {
                activeCount++;
            }
        }
        
        return activeCount;
    }
    
    getTopUsers(limit = 10) {
        const userArray = Array.from(this.users.entries());
        return userArray
            .sort((a, b) => b[1].messageCount - a[1].messageCount)
            .slice(0, limit)
            .map(([userId, data]) => ({
                userId,
                messageCount: data.messageCount,
                channels: Array.from(data.channels)
            }));
    }
}
```

### 3. Channel Performance Metrics

```javascript
class ChannelMetrics {
    constructor() {
        this.channels = new Map();
    }
    
    trackChannelMessage(channel, messageSize) {
        if (!this.channels.has(channel)) {
            this.channels.set(channel, {
                messageCount: 0,
                totalBytes: 0,
                subscribers: new Set(),
                firstMessage: Date.now(),
                lastMessage: Date.now()
            });
        }
        
        const metrics = this.channels.get(channel);
        metrics.messageCount++;
        metrics.totalBytes += messageSize;
        metrics.lastMessage = Date.now();
    }
    
    getChannelStats(channel) {
        const metrics = this.channels.get(channel);
        if (!metrics) return null;
        
        const duration = (metrics.lastMessage - metrics.firstMessage) / 1000;
        
        return {
            channel,
            messageCount: metrics.messageCount,
            averageMessageSize: Math.round(metrics.totalBytes / metrics.messageCount),
            messagesPerSecond: (metrics.messageCount / duration).toFixed(2),
            subscribers: metrics.subscribers.size,
            duration: `${Math.round(duration)} seconds`
        };
    }
    
    getTopChannels(limit = 10) {
        return Array.from(this.channels.entries())
            .sort((a, b) => b[1].messageCount - a[1].messageCount)
            .slice(0, limit)
            .map(([channel, _]) => this.getChannelStats(channel));
    }
}
```

## 🎨 Visualization Examples

### Dashboard Data Structure

```javascript
const dashboardData = {
    realtime: {
        messagesPerSecond: 125.5,
        activeConnections: 1500,
        channelsActive: 45,
        bytesTransferred: 1024000
    },
    hourly: {
        messageVolume: [100, 150, 200, 180, 220, ...],
        activeUsers: [50, 75, 90, 85, 95, ...],
        errorRate: [0.1, 0.05, 0.08, 0.06, 0.04, ...]
    },
    topChannels: [
        { name: 'chat-main', messages: 50000, users: 200 },
        { name: 'notifications', messages: 35000, users: 500 },
        { name: 'chat-support', messages: 20000, users: 150 }
    ],
    geographic: {
        'us-east': { messages: 40000, latency: 45 },
        'eu-west': { messages: 30000, latency: 52 },
        'ap-south': { messages: 20000, latency: 78 }
    }
};
```

## 📈 Best Practices

1. **Set up alerts** for anomalous traffic patterns
2. **Monitor peak hours** to plan capacity
3. **Track error rates** to identify issues
4. **Analyze channel usage** to optimize architecture
5. **Review user activity** for engagement insights
6. **Export data** regularly for long-term analysis
7. **Correlate metrics** with business KPIs

## 🔗 Resources

- [PubNub Illuminate Documentation](https://www.pubnub.com/docs/illuminate/)
- [Analytics Dashboard](https://admin.pubnub.com/analytics)
- [REST API Reference](https://www.pubnub.com/docs/platform/reference/rest-api)

