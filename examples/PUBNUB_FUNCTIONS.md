# PubNub Functions - Server-Side Logic Guide

PubNub Functions enable you to execute server-side code without managing infrastructure. This guide covers implementation patterns and best practices.

## 📋 Overview

**PubNub Functions** are event-driven serverless functions that run on PubNub's global infrastructure. They allow you to:
- Transform messages in real-time
- Enrich data with external API calls
- Implement server-side validation
- Trigger webhooks and integrations
- Build complex business logic without servers

## 🎯 Common Use Cases

### 1. Message Moderation & Filtering

```javascript
// Auto-moderation function
export default (request) => {
    const pubnub = require('pubnub');
    const vault = require('vault');
    const xhr = require('xhr');
    
    const message = request.message;
    
    // Profanity filter
    const profanityList = vault.get('profanity_list').split(',');
    let filteredText = message.text;
    
    profanityList.forEach(word => {
        const regex = new RegExp(word, 'gi');
        filteredText = filteredText.replace(regex, '***');
    });
    
    // Check for spam patterns
    if (isSpam(message)) {
        return request.abort(); // Block the message
    }
    
    // Update message with filtered content
    request.message.text = filteredText;
    request.message.moderated = filteredText !== message.text;
    
    return request.ok();
};

function isSpam(message) {
    // Check for excessive caps
    const capsRatio = (message.text.match(/[A-Z]/g) || []).length / message.text.length;
    if (capsRatio > 0.7) return true;
    
    // Check for repeated characters
    if (/(.)\1{4,}/.test(message.text)) return true;
    
    return false;
}
```

### 2. Message Enrichment with External APIs

```javascript
// Enrich messages with user data
export default (request) => {
    const xhr = require('xhr');
    const vault = require('vault');
    
    const message = request.message;
    const userId = message.userId;
    
    // Fetch user profile from external API
    const apiUrl = `https://api.example.com/users/${userId}`;
    const apiKey = vault.get('api_key');
    
    return xhr.fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    }).then(response => {
        const userData = JSON.parse(response.body);
        
        // Enrich message with user data
        request.message.userProfile = {
            name: userData.name,
            avatar: userData.avatar,
            verified: userData.verified
        };
        
        return request.ok();
    }).catch(error => {
        console.log('Error fetching user data:', error);
        return request.ok(); // Continue even if enrichment fails
    });
};
```

### 3. Analytics & Logging

```javascript
// Track message analytics
export default (request) => {
    const kvstore = require('kvstore');
    const message = request.message;
    
    // Increment message counter
    const counterKey = `msg_count_${request.channels[0]}`;
    
    return kvstore.get(counterKey).then(count => {
        const newCount = (count || 0) + 1;
        return kvstore.set(counterKey, newCount);
    }).then(() => {
        // Track user activity
        const userKey = `user_activity_${message.userId}`;
        return kvstore.get(userKey);
    }).then(activity => {
        const userActivity = activity || {
            messageCount: 0,
            lastActive: null
        };
        
        userActivity.messageCount++;
        userActivity.lastActive = new Date().toISOString();
        
        return kvstore.set(`user_activity_${message.userId}`, userActivity);
    }).then(() => {
        // Add analytics metadata to message
        request.message.analytics = {
            tracked: true,
            timestamp: new Date().toISOString()
        };
        
        return request.ok();
    }).catch(error => {
        console.log('Analytics error:', error);
        return request.ok();
    });
};
```

### 4. Webhook Integration

```javascript
// Trigger webhook on specific events
export default (request) => {
    const xhr = require('xhr');
    const vault = require('vault');
    const message = request.message;
    
    // Check if message contains important keyword
    if (message.text.toLowerCase().includes('urgent') || 
        message.text.toLowerCase().includes('critical')) {
        
        const webhookUrl = vault.get('webhook_url');
        
        const payload = {
            event: 'urgent_message',
            channel: request.channels[0],
            message: message,
            timestamp: new Date().toISOString()
        };
        
        // Send webhook (non-blocking)
        xhr.fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(() => {
            console.log('Webhook sent successfully');
        }).catch(error => {
            console.log('Webhook error:', error);
        });
    }
    
    return request.ok();
};
```

### 5. Rate Limiting per User

```javascript
// Implement per-user rate limiting
export default (request) => {
    const kvstore = require('kvstore');
    const userId = request.message.userId;
    const rateKey = `rate_limit_${userId}`;
    
    return kvstore.get(rateKey).then(data => {
        const now = Date.now();
        const rateLimit = data || {
            count: 0,
            resetTime: now + 60000 // 1 minute
        };
        
        // Reset if time window has passed
        if (now > rateLimit.resetTime) {
            rateLimit.count = 0;
            rateLimit.resetTime = now + 60000;
        }
        
        // Check rate limit (max 10 messages per minute)
        if (rateLimit.count >= 10) {
            console.log(`Rate limit exceeded for user ${userId}`);
            return request.abort();
        }
        
        // Increment counter
        rateLimit.count++;
        
        // Save updated rate limit
        return kvstore.set(rateKey, rateLimit, 1).then(() => {
            // Add rate limit info to message
            request.message.rateLimitInfo = {
                remaining: 10 - rateLimit.count,
                resetTime: rateLimit.resetTime
            };
            
            return request.ok();
        });
    }).catch(error => {
        console.log('Rate limiting error:', error);
        return request.ok(); // Allow message on error
    });
};
```

### 6. Message Translation

```javascript
// Auto-translate messages
export default (request) => {
    const xhr = require('xhr');
    const vault = require('vault');
    const message = request.message;
    
    // Check if translation is requested
    if (!message.targetLanguage) {
        return request.ok();
    }
    
    const translateApiUrl = 'https://translation.googleapis.com/language/translate/v2';
    const apiKey = vault.get('google_translate_api_key');
    
    return xhr.fetch(`${translateApiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            q: message.text,
            target: message.targetLanguage,
            format: 'text'
        })
    }).then(response => {
        const result = JSON.parse(response.body);
        
        // Add translation to message
        request.message.translations = {
            [message.targetLanguage]: result.data.translations[0].translatedText,
            originalLanguage: result.data.translations[0].detectedSourceLanguage
        };
        
        return request.ok();
    }).catch(error => {
        console.log('Translation error:', error);
        return request.ok();
    });
};
```

### 7. Data Validation & Schema Enforcement

```javascript
// Validate message schema
export default (request) => {
    const message = request.message;
    
    // Required fields
    const requiredFields = ['text', 'userId', 'username'];
    for (const field of requiredFields) {
        if (!message[field]) {
            console.log(`Missing required field: ${field}`);
            return request.abort();
        }
    }
    
    // Validate text length
    if (message.text.length > 500) {
        console.log('Message too long');
        return request.abort();
    }
    
    if (message.text.length === 0) {
        console.log('Empty message');
        return request.abort();
    }
    
    // Validate userId format
    if (!/^user-[a-z0-9]+$/.test(message.userId)) {
        console.log('Invalid userId format');
        return request.abort();
    }
    
    // Sanitize username
    message.username = message.username.trim().substring(0, 20);
    
    // Add validation metadata
    request.message.validated = true;
    request.message.validatedAt = new Date().toISOString();
    
    return request.ok();
};
```

## 🔧 Best Practices

### 1. Error Handling
Always use try-catch or promise error handling to prevent function failures:

```javascript
export default (request) => {
    try {
        // Your logic here
        return request.ok();
    } catch (error) {
        console.log('Function error:', error);
        return request.ok(); // Or request.abort() based on use case
    }
};
```

### 2. Use Vault for Secrets
Never hardcode API keys or secrets:

```javascript
const vault = require('vault');
const apiKey = vault.get('api_key');
```

### 3. Optimize Performance
- Keep functions lightweight (< 5KB recommended)
- Minimize external API calls
- Use KV Store for caching
- Set appropriate timeouts

### 4. Use KV Store for State
```javascript
const kvstore = require('kvstore');

// Set with TTL (in minutes)
kvstore.set('key', value, 60); // Expires in 60 minutes

// Get value
kvstore.get('key').then(value => {
    // Use value
});
```

### 5. Logging
Use console.log for debugging (visible in PubNub Console):

```javascript
console.log('Debug info:', {
    channel: request.channels[0],
    userId: request.message.userId
});
```

## 📊 Function Types

### Before Publish or Fire (BeforePublishOrFire)
- Runs before message is published
- Can modify, enrich, or block messages
- Most common use case

### After Publish or Fire (AfterPublishOrFire)
- Runs after message is published
- Cannot modify message
- Good for analytics and notifications

### After Presence (AfterPresence)
- Runs after presence events
- Track user joins/leaves
- Update user status

## 🚀 Deployment

Functions are deployed through the PubNub Admin Portal:

1. Go to Admin Portal > Functions
2. Create new Module
3. Add Event Handler
4. Write your function code
5. Test with mock payloads
6. Deploy to production

## 📝 Testing

Use the built-in test console with mock payloads:

```json
{
    "message": {
        "text": "Test message",
        "userId": "user-123",
        "username": "TestUser"
    },
    "channels": ["test-channel"],
    "publishOptions": {}
}
```

## 🔗 Additional Resources

- [PubNub Functions Documentation](https://www.pubnub.com/docs/functions/)
- [Functions Catalog](https://www.pubnub.com/integrations/)
- [Best Practices Guide](https://www.pubnub.com/docs/functions/best-practices)

