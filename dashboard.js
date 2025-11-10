// Enhanced PubNub Dashboard with Advanced Features
class PubNubDashboard {
    constructor() {
        this.channel = 'pubnub-advanced-demo';
        this.username = localStorage.getItem('pubnub-username') || '';
        this.userId = this.generateUserId();
        this.onlineUsers = new Map();
        this.typingUsers = new Set();
        this.analytics = {
            messagesSent: 0,
            messagesReceived: 0,
            messagesModerated: 0,
            messageHistory: [],
            startTime: Date.now()
        };
        
        this.initializePubNub();
        this.initializeUI();
        this.setupEventListeners();
        this.initializeModerationFilters();
        this.startAnalytics();
    }

    generateUserId() {
        let userId = localStorage.getItem('pubnub-user-id');
        if (!userId) {
            userId = 'user-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('pubnub-user-id', userId);
        }
        return userId;
    }

    initializePubNub() {
        this.pubnub = new PubNub({
            publishKey: 'demo',
            subscribeKey: 'demo',
            userId: this.userId,
            heartbeatInterval: 19
        });

        this.pubnub.addListener({
            message: this.handleMessage.bind(this),
            presence: this.handlePresence.bind(this),
            status: this.handleStatus.bind(this),
            objects: this.handleObjectsEvent.bind(this)
        });

        this.pubnub.subscribe({
            channels: [this.channel, `${this.channel}-typing`],
            withPresence: true
        });
    }

    initializeUI() {
        this.elements = {
            usernameInput: document.getElementById('username-input'),
            setUsernameBtn: document.getElementById('set-username'),
            userAvatar: document.getElementById('user-avatar'),
            messageInput: document.getElementById('message-input'),
            sendButton: document.getElementById('send-button'),
            messagesContainer: document.getElementById('messages-container'),
            usersList: document.getElementById('users-list'),
            userCount: document.getElementById('user-count'),
            typingIndicator: document.getElementById('typing-indicator'),
            connectionStatus: document.getElementById('connection-status'),
            themeToggle: document.getElementById('theme-toggle'),
            
            // Analytics
            messagesSent: document.getElementById('messages-sent'),
            messagesReceived: document.getElementById('messages-received'),
            messagesModerated: document.getElementById('messages-moderated'),
            messagesPerMin: document.getElementById('messages-per-min'),
            
            // Moderation
            profanityFilter: document.getElementById('profanity-filter'),
            spamDetection: document.getElementById('spam-detection'),
            capsNormalization: document.getElementById('caps-normalization'),
            moderationStatus: document.getElementById('moderation-status'),
            
            // Event Log
            eventLog: document.getElementById('event-log'),
            
            // Modal
            metadataModal: document.getElementById('metadata-modal'),
            viewMetadataBtn: document.getElementById('view-metadata'),
            metadataJson: document.getElementById('metadata-json')
        };

        if (this.username) {
            this.updateUserAvatar();
            this.elements.messageInput.disabled = false;
            this.elements.sendButton.disabled = false;
        }

        this.initializeTheme();
        this.initializeChart();
    }

    setupEventListeners() {
        // Username setup
        this.elements.setUsernameBtn.addEventListener('click', () => this.setUsername());
        this.elements.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.setUsername();
        });

        // Message sending
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Typing indicator
        this.elements.messageInput.addEventListener('input', () => this.handleTyping());

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // View metadata
        this.elements.viewMetadataBtn.addEventListener('click', () => this.showMetadata());

        // Modal close
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }

        // Close modal on outside click
        this.elements.metadataModal.addEventListener('click', (e) => {
            if (e.target === this.elements.metadataModal) {
                this.closeModal();
            }
        });
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================

    setUsername() {
        const username = this.elements.usernameInput.value.trim();
        if (!username) {
            this.showNotification('Please enter a username', 'error');
            return;
        }

        this.username = username;
        localStorage.setItem('pubnub-username', username);
        
        this.updateUserAvatar();
        this.elements.usernameInput.value = '';
        this.elements.messageInput.disabled = false;
        this.elements.sendButton.disabled = false;

        // Set App Context metadata
        this.setUserMetadata();

        // Update presence state
        this.pubnub.setState({
            channels: [this.channel],
            state: { username: username }
        });

        this.sendSystemMessage(`${username} joined the chat`);
        this.logEvent(`User ${username} joined`, 'info');
    }

    updateUserAvatar() {
        if (this.username) {
            this.elements.userAvatar.textContent = this.username.charAt(0).toUpperCase();
        }
    }

    setUserMetadata() {
        this.pubnub.objects.setUUIDMetadata({
            uuid: this.userId,
            data: {
                name: this.username,
                profileUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(this.username)}`,
                custom: {
                    joinedAt: new Date().toISOString(),
                    messageCount: 0,
                    theme: this.currentTheme || 'light'
                }
            }
        }, (status, response) => {
            if (!status.error) {
                console.log('User metadata set:', response);
                this.logEvent('User metadata updated', 'success');
            }
        });
    }

    // ============================================
    // MESSAGING
    // ============================================

    sendMessage() {
        if (!this.username) {
            this.showNotification('Please set your username first', 'warning');
            return;
        }

        const text = this.elements.messageInput.value.trim();
        if (!text) return;

        // Apply moderation
        const moderation = this.moderateMessage(text);
        
        if (!moderation.passed) {
            this.showNotification(`Message blocked: ${moderation.reason}`, 'error');
            this.logEvent(`Message blocked: ${moderation.reason}`, 'warning');
            this.analytics.messagesModerated++;
            this.updateAnalytics();
            return;
        }

        const message = {
            text: moderation.filteredText,
            username: this.username,
            userId: this.userId,
            timestamp: new Date().toISOString(),
            moderated: moderation.filteredText !== text
        };

        this.pubnub.publish({
            channel: this.channel,
            message: message
        }, (status, response) => {
            if (!status.error) {
                this.elements.messageInput.value = '';
                this.analytics.messagesSent++;
                this.trackMessage(text); // Track the original text
                this.updateAnalytics();
                
                if (message.moderated) {
                    this.showNotification('Message was filtered', 'warning');
                    this.analytics.messagesModerated++;
                }
            } else {
                this.showNotification('Failed to send message', 'error');
            }
        });
    }

    sendSystemMessage(text) {
        const message = {
            text: text,
            username: 'System',
            userId: 'system',
            timestamp: new Date().toISOString(),
            isSystem: true
        };

        this.pubnub.publish({
            channel: this.channel,
            message: message
        });
    }

    handleMessage(event) {
        if (event.channel === this.channel) {
            const message = event.message;
            this.displayMessage(message, event.publisher === this.userId);
            
            if (event.publisher !== this.userId) {
                this.analytics.messagesReceived++;
                this.trackMessage();
                this.updateAnalytics();
            }
        } else if (event.channel === `${this.channel}-typing`) {
            this.handleTypingMessage(event);
        }
    }

    displayMessage(message, isOwn = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwn ? 'own' : ''}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        const moderatedBadge = message.moderated ? 
            '<span class="badge" style="font-size: 0.7rem; margin-left: 0.5rem;">🛡️ Filtered</span>' : '';

        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-author">${this.escapeHtml(message.username)}</span>
                <span class="message-time">${time}</span>
                ${moderatedBadge}
            </div>
            <div class="message-content">
                ${this.escapeHtml(message.text)}
            </div>
        `;

        const welcomeMessage = this.elements.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        this.elements.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    // ============================================
    // AUTO-MODERATION
    // ============================================

    initializeModerationFilters() {
        this.profanityList = ['spam', 'badword', 'inappropriate'];
        this.messageHistory = []; // Stores {text, timestamp} objects
        this.messageTimestamps = []; // Stores just timestamps for rate limiting
        this.maxMessagesPerMinute = 10;
        this.similarityThreshold = 0.8;
    }

    moderateMessage(text) {
        const result = {
            passed: true,
            reason: '',
            filteredText: text
        };

        // Check for duplicate/similar messages FIRST (before other checks)
        if (this.isDuplicateMessage(text)) {
            result.passed = false;
            result.reason = 'Duplicate message detected';
            return result;
        }

        // Profanity filter
        if (this.elements.profanityFilter.checked) {
            const lowerText = text.toLowerCase();
            for (const word of this.profanityList) {
                if (lowerText.includes(word)) {
                    result.filteredText = this.filterProfanity(text);
                    result.reason = 'Profanity detected';
                    break;
                }
            }
        }

        // Spam detection (rate limiting)
        if (this.elements.spamDetection.checked && this.isSpamming()) {
            result.passed = false;
            result.reason = 'Sending messages too quickly';
            return result;
        }

        // Caps normalization
        if (this.elements.capsNormalization.checked && this.hasExcessiveCaps(text)) {
            result.filteredText = this.normalizeCaps(text);
        }

        return result;
    }

    filterProfanity(text) {
        let filtered = text;
        for (const word of this.profanityList) {
            const regex = new RegExp(word, 'gi');
            filtered = filtered.replace(regex, '***');
        }
        return filtered;
    }

    isSpamming() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentMessages = this.messageTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
        return recentMessages.length >= this.maxMessagesPerMinute;
    }

    isDuplicateMessage(text) {
        if (this.messageHistory.length === 0) return false;
        
        const now = Date.now();
        const lastMessage = this.messageHistory[this.messageHistory.length - 1];
        const timeSinceLastMessage = now - lastMessage.timestamp;
        
        // Check if exact same message was sent within 5 seconds
        if (timeSinceLastMessage < 5000 && lastMessage.text === text) {
            return true;
        }
        
        // Check for very similar messages within 10 seconds
        const similarity = this.calculateSimilarity(text, lastMessage.text);
        return similarity > this.similarityThreshold && timeSinceLastMessage < 10000;
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    hasExcessiveCaps(text) {
        if (text.length < 5) return false;
        const capsCount = (text.match(/[A-Z]/g) || []).length;
        return capsCount / text.length > 0.6;
    }

    normalizeCaps(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    trackMessage(text) {
        const now = Date.now();
        
        // Track message text and timestamp for duplicate detection
        this.messageHistory.push({
            text: text,
            timestamp: now
        });
        
        // Keep only last 10 messages for duplicate detection
        if (this.messageHistory.length > 10) {
            this.messageHistory.shift();
        }
        
        // Track timestamps for rate limiting
        this.messageTimestamps.push(now);
        const oneMinuteAgo = now - 60000;
        this.messageTimestamps = this.messageTimestamps.filter(t => t > oneMinuteAgo);
    }

    // ============================================
    // PRESENCE & TYPING
    // ============================================

    handlePresence(event) {
        const username = event.state?.username || event.uuid;
        
        switch (event.action) {
            case 'join':
                this.onlineUsers.set(event.uuid, { username, state: event.state });
                this.updateUsersList();
                if (event.uuid !== this.userId) {
                    this.logEvent(`${username} joined`, 'info');
                }
                break;
                
            case 'leave':
            case 'timeout':
                this.onlineUsers.delete(event.uuid);
                this.updateUsersList();
                if (event.uuid !== this.userId) {
                    this.logEvent(`${username} left`, 'info');
                }
                break;
        }
    }

    updateUsersList() {
        this.elements.usersList.innerHTML = '';
        this.elements.userCount.textContent = this.onlineUsers.size;

        this.onlineUsers.forEach((userInfo, userId) => {
            const li = document.createElement('li');
            const displayName = userId === this.userId ? 
                `${userInfo.username} (You)` : userInfo.username;
            li.textContent = displayName;
            this.elements.usersList.appendChild(li);
        });
    }

    handleTyping() {
        if (!this.username) return;

        clearTimeout(this.typingTimeout);
        
        const text = this.elements.messageInput.value.trim();
        if (text) {
            this.pubnub.publish({
                channel: `${this.channel}-typing`,
                message: {
                    userId: this.userId,
                    username: this.username,
                    typing: true
                }
            });

            this.typingTimeout = setTimeout(() => {
                this.stopTyping();
            }, 3000);
        }
    }

    stopTyping() {
        this.pubnub.publish({
            channel: `${this.channel}-typing`,
            message: {
                userId: this.userId,
                username: this.username,
                typing: false
            }
        });
    }

    handleTypingMessage(event) {
        const data = event.message;
        if (data.userId === this.userId) return;

        if (data.typing) {
            this.typingUsers.add(data.username);
        } else {
            this.typingUsers.delete(data.username);
        }

        this.updateTypingIndicator();
    }

    updateTypingIndicator() {
        const typing = Array.from(this.typingUsers);
        if (typing.length === 0) {
            this.elements.typingIndicator.textContent = '';
        } else if (typing.length === 1) {
            this.elements.typingIndicator.textContent = `${typing[0]} is typing...`;
        } else {
            this.elements.typingIndicator.textContent = `${typing[0]} and ${typing.length - 1} others are typing...`;
        }
    }

    // ============================================
    // ANALYTICS
    // ============================================

    startAnalytics() {
        this.chartData = {
            labels: [],
            datasets: [{
                label: 'Messages',
                data: [],
                borderColor: '#3b82f6',
                tension: 0.4
            }]
        };

        setInterval(() => {
            this.updateAnalytics();
            this.updateChart();
        }, 5000);
    }

    updateAnalytics() {
        this.elements.messagesSent.textContent = this.analytics.messagesSent;
        this.elements.messagesReceived.textContent = this.analytics.messagesReceived;
        this.elements.messagesModerated.textContent = this.analytics.messagesModerated;

        const duration = (Date.now() - this.analytics.startTime) / 60000;
        const totalMessages = this.analytics.messagesSent + this.analytics.messagesReceived;
        const messagesPerMin = duration > 0 ? (totalMessages / duration).toFixed(1) : 0;
        this.elements.messagesPerMin.textContent = messagesPerMin;
    }

    initializeChart() {
        const canvas = document.getElementById('activity-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: this.chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    updateChart() {
        if (!this.chart) return;

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const total = this.analytics.messagesSent + this.analytics.messagesReceived;

        this.chartData.labels.push(now);
        this.chartData.datasets[0].data.push(total);

        if (this.chartData.labels.length > 10) {
            this.chartData.labels.shift();
            this.chartData.datasets[0].data.shift();
        }

        this.chart.update();
    }

    // ============================================
    // APP CONTEXT & METADATA
    // ============================================

    handleObjectsEvent(event) {
        console.log('Objects event:', event);
        this.logEvent(`Metadata updated: ${event.message.type}`, 'info');
    }

    showMetadata() {
        this.pubnub.objects.getUUIDMetadata({
            uuid: this.userId
        }, (status, response) => {
            if (!status.error) {
                this.elements.metadataJson.textContent = JSON.stringify(response.data, null, 2);
                this.elements.metadataModal.classList.add('active');
            } else {
                this.showNotification('Failed to fetch metadata', 'error');
            }
        });
    }

    closeModal() {
        this.elements.metadataModal.classList.remove('active');
    }

    // ============================================
    // STATUS & EVENTS
    // ============================================

    handleStatus(statusEvent) {
        const statusText = this.elements.connectionStatus.querySelector('.status-text');
        const statusIndicator = this.elements.connectionStatus.querySelector('.status-indicator');

        if (statusEvent.category === 'PNConnectedCategory') {
            statusText.textContent = 'Connected';
            statusIndicator.classList.add('connected');
            this.showNotification('Connected to PubNub', 'success');
            this.logEvent('Connected to PubNub', 'success');
        } else if (statusEvent.category === 'PNNetworkDownCategory') {
            statusText.textContent = 'Disconnected';
            statusIndicator.classList.remove('connected');
            this.showNotification('Connection lost', 'error');
            this.logEvent('Connection lost', 'error');
        }
    }

    logEvent(message, type = 'info') {
        const eventItem = document.createElement('div');
        eventItem.className = `event-log-item ${type}`;
        eventItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        this.elements.eventLog.insertBefore(eventItem, this.elements.eventLog.firstChild);

        // Keep only last 20 events
        while (this.elements.eventLog.children.length > 20) {
            this.elements.eventLog.removeChild(this.elements.eventLog.lastChild);
        }
    }

    // ============================================
    // UI UTILITIES
    // ============================================

    initializeTheme() {
        const savedTheme = localStorage.getItem('pubnub-theme') || 'light';
        this.currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('pubnub-theme', this.currentTheme);
        this.updateThemeIcon();
        this.showNotification(`Switched to ${this.currentTheme} theme`, 'info');
    }

    updateThemeIcon() {
        const icon = this.elements.themeToggle.querySelector('.theme-icon');
        icon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
    }

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: '2000',
            animation: 'slideInRight 0.3s ease'
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new PubNubDashboard();
});

