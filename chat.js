// PubNub Chat Application
class PubNubChat {
    constructor() {
        this.channel = 'pubnub-web-chat';
        this.username = localStorage.getItem('pubnub-chat-username') || '';
        this.userId = this.generateUserId();
        this.onlineUsers = new Map(); // Changed to Map to store user info
        this.typingUsers = new Set();
        this.typingTimeout = null;
        this.hasSetUsername = !!this.username;
        this.presenceRefreshInterval = null;
        
        this.initializePubNub();
        this.initializeUI();
        this.setupEventListeners();
        this.updateMessageInputState();
        this.startPresenceRefresh();
        
        // If we have a stored username, set it in the UI
        if (this.username) {
            this.elements.usernameDisplay.textContent = this.username;
            this.elements.usernameInput.value = '';
        } else {
            this.elements.usernameDisplay.textContent = 'Please set your name';
        }
    }

    generateUserId() {
        // Try to get existing user ID from localStorage, or create a new one
        let userId = localStorage.getItem('pubnub-chat-user-id');
        if (!userId) {
            userId = 'user-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('pubnub-chat-user-id', userId);
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

        // Set up listeners
        this.pubnub.addListener({
            message: (event) => {
                // Only handle messages from the main chat channel, not typing channel
                if (event.channel === this.channel) {
                    this.handleMessage(event);
                } else if (event.channel === `${this.channel}-typing`) {
                    this.handleTypingMessage(event);
                }
            },
            presence: this.handlePresence.bind(this),
            status: this.handleStatus.bind(this)
        });

        // Subscribe to channels
        this.pubnub.subscribe({
            channels: [this.channel, `${this.channel}-typing`],
            withPresence: true
        });
    }

    initializeUI() {
        this.elements = {
            usernameInput: document.getElementById('username-input'),
            setUsernameBtn: document.getElementById('set-username'),
            usernameDisplay: document.getElementById('username-display'),
            messageInput: document.getElementById('message-input'),
            sendButton: document.getElementById('send-button'),
            messagesContainer: document.getElementById('messages-container'),
            usersList: document.getElementById('users-list'),
            onlineCount: document.getElementById('online-count'),
            typingIndicator: document.getElementById('typing-indicator'),
            themeToggle: document.getElementById('theme-toggle'),
            themeIcon: document.querySelector('.theme-icon')
        };
        
        // Ensure theme elements exist
        if (!this.elements.themeToggle) {
            console.error('Theme toggle button not found!');
        }
        if (!this.elements.themeIcon) {
            console.error('Theme icon not found!');
        }
        
        // Initialize theme
        this.initializeTheme();
    }

    setupEventListeners() {
        // Username setup
        this.elements.setUsernameBtn.addEventListener('click', this.setUsername.bind(this));
        this.elements.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.setUsername();
        });

        // Message sending - ONLY on button click and Enter key
        this.elements.sendButton.addEventListener('click', this.sendMessage.bind(this));
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Typing indicator - separate from message sending
        this.elements.messageInput.addEventListener('input', this.handleTyping.bind(this));
        this.elements.messageInput.addEventListener('blur', this.stopTyping.bind(this));

        // Theme toggle
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
            console.log('Theme toggle event listener attached successfully');
        }
    }

    setUsername() {
        const newUsername = this.elements.usernameInput.value.trim();
        if (newUsername && newUsername.length > 0) {
            const oldUsername = this.username;
            this.username = newUsername;
            this.hasSetUsername = true;
            this.elements.usernameDisplay.textContent = this.username;
            this.elements.usernameInput.value = '';
            
            // Store username in localStorage for persistence
            localStorage.setItem('pubnub-chat-username', this.username);
            
            // Enable message input after setting username
            this.updateMessageInputState();
            
            // Announce username change
            if (oldUsername && oldUsername !== '') {
                this.sendSystemMessage(`${oldUsername} is now ${this.username}`);
            } else {
                this.sendSystemMessage(`${this.username} joined the chat`);
            }
            
            // Update user state
            this.pubnub.setState({
                channels: [this.channel],
                state: { username: this.username }
            });
        }
    }

    sendMessage() {
        // Check if username is set
        if (!this.hasSetUsername || !this.username) {
            this.showError('Please set your name before sending messages');
            return;
        }

        const messageText = this.elements.messageInput.value.trim();
        if (!messageText) return;

        const message = {
            text: messageText,
            username: this.username,
            userId: this.userId,
            timestamp: new Date().toISOString()
        };

        this.pubnub.publish({
            channel: this.channel,
            message: message
        }, (status, response) => {
            if (status.error) {
                this.showError('Failed to send message');
            } else {
                this.elements.messageInput.value = '';
                this.stopTyping();
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
        const message = event.message;
        this.displayMessage(message, event.publisher === this.userId);
    }

    handleTypingMessage(event) {
        const typingData = event.message;
        if (typingData.userId === this.userId) return; // Don't show our own typing
        
        if (typingData.typing) {
            this.typingUsers.add(typingData.username || typingData.userId);
        } else {
            this.typingUsers.delete(typingData.username || typingData.userId);
        }
        
        this.updateTypingIndicator();
    }

    displayMessage(message, isOwn = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwn ? 'own' : ''}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-author">${this.escapeHtml(message.username)}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">
                ${this.escapeHtml(message.text)}
            </div>
        `;

        // Remove welcome message if it exists
        const welcomeMessage = this.elements.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        this.elements.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    handlePresence(event) {
        const username = event.state?.username || event.uuid;
        
        switch (event.action) {
            case 'join':
                this.onlineUsers.set(event.uuid, {
                    username: username,
                    state: event.state
                });
                this.updateUsersList();
                this.updateOnlineCount();
                if (event.uuid !== this.userId) {
                    this.showNotification(`${username} joined`);
                }
                break;
                
            case 'leave':
            case 'timeout':
                this.onlineUsers.delete(event.uuid);
                this.updateUsersList();
                this.updateOnlineCount();
                if (event.uuid !== this.userId) {
                    this.showNotification(`${username} left`);
                }
                break;
                
            case 'state-change':
                // Update user info when they change their state (like username)
                if (this.onlineUsers.has(event.uuid)) {
                    this.onlineUsers.set(event.uuid, {
                        username: event.state?.username || event.uuid,
                        state: event.state
                    });
                    this.updateUsersList();
                }
                break;
        }
    }

    handleStatus(statusEvent) {
        if (statusEvent.category === 'PNConnectedCategory') {
            this.showNotification('Connected to chat');
            
            // Set user state if we have a username
            if (this.username) {
                this.pubnub.setState({
                    channels: [this.channel],
                    state: { username: this.username }
                });
            }
            
            this.getInitialPresence();
        } else if (statusEvent.category === 'PNNetworkDownCategory') {
            this.showError('Connection lost');
        } else if (statusEvent.category === 'PNNetworkUpCategory') {
            this.showNotification('Connection restored');
        }
    }

    getInitialPresence() {
        this.pubnub.hereNow({
            channels: [this.channel],
            includeUUIDs: true,
            includeState: true
        }, (status, response) => {
            if (!status.error && response.channels[this.channel]) {
                const channelData = response.channels[this.channel];
                this.onlineUsers.clear();
                
                channelData.occupants.forEach(occupant => {
                    this.onlineUsers.set(occupant.uuid, {
                        username: occupant.state?.username || occupant.uuid,
                        state: occupant.state
                    });
                });
                
                this.updateUsersList();
                this.updateOnlineCount();
            }
        });
    }

    updateUsersList() {
        this.elements.usersList.innerHTML = '';
        
        this.onlineUsers.forEach((userInfo, userId) => {
            const userItem = document.createElement('li');
            userItem.className = 'user-item';
            
            if (userId === this.userId) {
                userItem.textContent = `${this.username || userInfo.username} (You)`;
            } else {
                userItem.textContent = userInfo.username;
            }
            
            this.elements.usersList.appendChild(userItem);
        });
    }

    updateOnlineCount() {
        const count = this.onlineUsers.size;
        this.elements.onlineCount.textContent = `${count} online`;
    }

    startPresenceRefresh() {
        // Refresh presence every 30 seconds to ensure accuracy
        this.presenceRefreshInterval = setInterval(() => {
            this.getInitialPresence();
        }, 30000);
    }

    handleTyping() {
        // Don't send typing indicator if username not set
        if (!this.hasSetUsername || !this.username) {
            return;
        }

        // Only send typing indicator if there's actual text
        const messageText = this.elements.messageInput.value.trim();
        if (!messageText) {
            this.stopTyping();
            return;
        }

        // Send typing indicator to typing channel only
        this.pubnub.publish({
            channel: `${this.channel}-typing`,
            message: {
                userId: this.userId,
                username: this.username,
                typing: true
            }
        });

        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Set timeout to stop typing
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 3000);
    }

    stopTyping() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }

        this.pubnub.publish({
            channel: `${this.channel}-typing`,
            message: {
                userId: this.userId,
                username: this.username,
                typing: false
            }
        });
    }

    updateTypingIndicator() {
        const typingArray = Array.from(this.typingUsers);
        if (typingArray.length === 0) {
            this.elements.typingIndicator.textContent = '';
        } else if (typingArray.length === 1) {
            this.elements.typingIndicator.textContent = `${typingArray[0]} is typing...`;
        } else if (typingArray.length === 2) {
            this.elements.typingIndicator.textContent = `${typingArray[0]} and ${typingArray[1]} are typing...`;
        } else {
            this.elements.typingIndicator.textContent = `${typingArray[0]} and ${typingArray.length - 1} others are typing...`;
        }
    }

    updateMessageInputState() {
        if (this.hasSetUsername) {
            // Enable message input and send button
            this.elements.messageInput.disabled = false;
            this.elements.sendButton.disabled = false;
            this.elements.messageInput.placeholder = 'Type your message...';
        } else {
            // Disable message input and send button
            this.elements.messageInput.disabled = true;
            this.elements.sendButton.disabled = true;
            this.elements.messageInput.placeholder = 'Please set your name first...';
            this.elements.messageInput.value = '';
        }
    }

    showNotification(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        
        // Add toast styles
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'var(--accent-primary)',
            color: 'var(--text-inverse)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: '1000',
            fontSize: '0.9rem',
            fontWeight: '500',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
        
        console.log('Notification:', message);
    }

    showError(message) {
        console.error('Error:', message);
        
        // Show error message in typing indicator area temporarily
        const originalText = this.elements.typingIndicator.textContent;
        this.elements.typingIndicator.textContent = `❌ ${message}`;
        this.elements.typingIndicator.style.color = '#ef4444';
        
        // Clear error after 3 seconds
        setTimeout(() => {
            this.elements.typingIndicator.textContent = originalText;
            this.elements.typingIndicator.style.color = '';
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

    cleanup() {
        // Clear presence refresh interval
        if (this.presenceRefreshInterval) {
            clearInterval(this.presenceRefreshInterval);
        }
        
        // Clear typing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Unsubscribe from channels
        this.pubnub.unsubscribe({
            channels: [this.channel, `${this.channel}-typing`]
        });
    }

    // Method to clear stored user data (for testing/debugging)
    clearStoredUserData() {
        localStorage.removeItem('pubnub-chat-user-id');
        localStorage.removeItem('pubnub-chat-username');
        console.log('Stored user data cleared. Refresh the page to get a new user ID.');
    }

    // Theme Management Methods
    initializeTheme() {
        // Get saved theme from localStorage or default to light
        const savedTheme = localStorage.getItem('pubnub-chat-theme') || 'light';
        this.currentTheme = savedTheme;
        
        // Apply the theme
        this.applyTheme(savedTheme);
        console.log('Theme initialized:', savedTheme);
    }

    toggleTheme() {
        console.log('Theme toggle clicked!');
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        console.log('Switching from', this.currentTheme, 'to', newTheme);
        
        this.currentTheme = newTheme;
        
        // Add switching animation
        if (this.elements.themeToggle) {
            this.elements.themeToggle.classList.add('switching');
            setTimeout(() => {
                this.elements.themeToggle.classList.remove('switching');
            }, 500);
        }
        
        // Apply the new theme
        this.applyTheme(newTheme);
        
        // Save to localStorage
        localStorage.setItem('pubnub-chat-theme', newTheme);
        
        // Show notification
        this.showNotification(`Switched to ${newTheme} theme`);
    }

    applyTheme(theme) {
        console.log('Applying theme:', theme);
        
        // Set the data-theme attribute on the document element
        document.documentElement.setAttribute('data-theme', theme);
        
        // Also set it on the body for extra compatibility
        document.body.setAttribute('data-theme', theme);
        
        console.log('Theme applied - data-theme attribute set to:', theme);
        
        // Update theme icon
        if (this.elements.themeIcon) {
            this.elements.themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
        
        // Update theme toggle title
        if (this.elements.themeToggle) {
            this.elements.themeToggle.title = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`;
        }
        
        // Trigger a reflow to ensure styles are applied
        void document.body.offsetHeight;
    }
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    const chat = new PubNubChat();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        chat.cleanup();
    });
});
