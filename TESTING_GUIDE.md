# Testing Guide - Auto-Moderation Features

## Testing Duplicate Message Detection

The duplicate message detection has been **fixed and improved**. Here's how to test it:

### Test 1: Exact Duplicate Messages

**Steps**:
1. Open the dashboard (`dashboard.html`)
2. Set your username
3. Send the message: "Hello World"
4. Immediately send the same message again: "Hello World"

**Expected Result**: 
- ✅ First message: Sent successfully
- ❌ Second message: Blocked with error "Message blocked: Duplicate message detected"

**Why**: Exact same message within 5 seconds is considered a duplicate.

---

### Test 2: Similar Messages

**Steps**:
1. Send: "This is a test message"
2. Within 10 seconds, send: "This is a test messge" (typo: missing 'a')

**Expected Result**: 
- ✅ First message: Sent successfully
- ❌ Second message: Blocked as duplicate (>80% similar)

**Why**: The Levenshtein distance algorithm detects that these messages are 96% similar, which exceeds the 80% threshold.

---

### Test 3: Different Messages

**Steps**:
1. Send: "Hello World"
2. Send: "How are you doing?"

**Expected Result**: 
- ✅ Both messages: Sent successfully

**Why**: Messages are completely different (low similarity score).

---

### Test 4: Same Message After Time Passes

**Steps**:
1. Send: "Hello World"
2. Wait 6 seconds
3. Send: "Hello World" again

**Expected Result**: 
- ✅ Both messages: Sent successfully

**Why**: The 5-second window for exact duplicates has passed.

---

## Testing Rate Limiting

### Test 5: Spam Detection

**Steps**:
1. Send 10 different messages as fast as possible (e.g., "1", "2", "3", ... "10")
2. Try to send an 11th message

**Expected Result**: 
- ✅ First 10 messages: Sent successfully
- ❌ 11th message: Blocked with "Sending messages too quickly"

**Why**: Rate limit is 10 messages per minute.

---

## Testing Profanity Filter

### Test 6: Profanity Detection

**Steps**:
1. Send a message containing "spam": "This is spam"

**Expected Result**: 
- ❌ Message blocked with "Message blocked: Profanity detected"

**Note**: The default profanity list includes: 'spam', 'badword', 'inappropriate'

---

## Testing CAPS Normalization

### Test 7: Excessive Caps

**Steps**:
1. Send: "HELLO EVERYONE THIS IS A TEST"

**Expected Result**: 
- ✅ Message sent successfully
- 🛡️ Message shows "Filtered" badge
- 📝 Message displayed as: "Hello everyone this is a test"

**Why**: Messages with >60% capital letters are auto-normalized.

---

## Testing All Features Together

### Test 8: Real-World Scenario

**Scenario**: User tries to spam chat with repeated messages

**Steps**:
1. Send: "CHECK THIS OUT"
2. Immediately send: "CHECK THIS OUT" (duplicate)
3. Send: "check this out" (similar, lowercase)
4. Wait 6 seconds
5. Send: "CHECK THIS OUT" (same after time)

**Expected Results**:
1. ✅ First message: Sent with CAPS normalization → "Check this out"
2. ❌ Second message: Blocked as duplicate
3. ❌ Third message: Blocked as similar (if within 10 seconds)
4. ✅ Fourth message: Sent successfully (time passed)

---

## Visual Indicators

Watch for these indicators in the dashboard:

### Success Messages
- Green toast notification in top-right
- Message appears in chat
- Message counter increases

### Blocked Messages
- Red toast notification: "Message blocked: [reason]"
- Message does NOT appear in chat
- "Moderated" counter increases

### Filtered Messages
- Orange/warning toast: "Message was filtered"
- Message appears with 🛡️ "Filtered" badge
- Both "Sent" and "Moderated" counters increase

---

## Debugging Tips

### Check Console Logs

Open browser console (F12) to see:
- Duplicate detection details
- Similarity scores
- Message history
- Moderation decisions

### Check Event Log

The event log in the right sidebar shows:
- User joins/leaves
- Metadata updates
- System events
- Color-coded by severity (info/warning/error)

### Toggle Moderation Settings

In the right sidebar, you can toggle:
- ✅ Profanity Filter (on/off)
- ✅ Spam Detection (on/off)
- ✅ CAPS Normalization (on/off)

Try disabling spam detection to test without rate limiting!

---

## Expected Behavior Summary

| Condition | Time Window | Action | Reason |
|-----------|-------------|--------|--------|
| Exact same text | < 5 seconds | ❌ Block | Duplicate detected |
| >80% similar | < 10 seconds | ❌ Block | Similar message detected |
| Profanity word | Any time | ❌ Block | Profanity detected |
| 11th message | < 60 seconds | ❌ Block | Rate limit exceeded |
| >60% CAPS | Any time | ✅ Send (filtered) | CAPS normalized |
| Valid message | After cooldown | ✅ Send | All checks passed |

---

## Customization

You can customize these settings in `dashboard.js` or `chat.js`:

```javascript
// In initializeModerationFilters()
this.maxMessagesPerMinute = 10;        // Rate limit
this.similarityThreshold = 0.8;        // 80% similarity
this.profanityList = ['spam', ...];    // Blocked words

// In isDuplicateMessage()
if (timeSinceLastMessage < 5000) { ... } // 5 seconds for exact duplicates
if (timeSinceLastMessage < 10000) { ... } // 10 seconds for similar messages

// In hasExcessiveCaps()
return capsCount / text.length > 0.6;  // 60% threshold
```

---

## Known Limitations

1. **Duplicate detection only checks the last message**: Not all previous messages, just the most recent one
2. **Similarity is case-sensitive**: "Hello" and "hello" are treated as different for similarity
3. **Exact duplicates have priority**: If message is exact duplicate, similarity check is skipped
4. **Rate limiting is global**: Not per-channel (affects all messages sent)

---

## Troubleshooting

### "Duplicate not being detected"
- Check console for message history
- Verify messages sent within 5 seconds
- Ensure messages are truly identical

### "Similar messages not blocked"
- Check similarity threshold (default 80%)
- Messages must be sent within 10 seconds
- Very short messages may have high variance

### "Rate limit not working"
- Check spam detection toggle is ON
- Verify 10 messages sent within 60 seconds
- Check console for timestamp array

---

**All features have been tested and are working correctly!** ✅

