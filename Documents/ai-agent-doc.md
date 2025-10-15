# AI Agent Services Documentation

## Air Harmony Insight Backend - AI Chat Assistant

### Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [AI Agent Capabilities](#ai-agent-capabilities)
5. [Frontend Implementation Guidelines](#frontend-implementation-guidelines)
6. [Request/Response Examples](#requestresponse-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Environment Setup](#environment-setup)

---

## Overview

The Air Harmony Insight backend provides a sophisticated AI Agent powered by OpenAI's GPT-4 that offers intelligent building management assistance. The AI Agent is context-aware, building-specific, and capable of analyzing air quality data, providing recommendations, and helping resolve alerts.

### Key Features

- 🏢 **Building-Aware**: AI understands specific building context and data
- 🔍 **Air Quality Expert**: Analyzes PM2.5, CO2, TVOC, temperature, humidity, and pressure
- 📊 **Data-Driven**: Provides insights based on real sensor data and alerts
- 💬 **Conversational**: Maintains conversation history and context
- ⚡ **Real-time**: Instant responses with OpenAI integration
- 🛠️ **Action-Oriented**: Can provide step-by-step solutions and recommendations

---

## Authentication

All AI Agent endpoints require JWT authentication.

### Getting Authentication Token

**Endpoint**: `POST /api/auth/login`

**Request**:

```json
{
  "email": "admin@greentech.com",
  "password": "password123"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "86c4472176ace75f138524c05811125930d8be0c6ebf...",
    "user": {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "email": "admin@greentech.com",
      "name": "Admin User",
      "role": "admin"
    },
    "expiresIn": "24h"
  }
}
```

### Using Authentication Token

Include the token in all AI Agent requests:

```http
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

**Token Expiry**: 24 hours
**Refresh**: Request new token when expired (no automatic refresh implemented)

---

## API Endpoints

### 1. Send Chat Message

Create a new conversation or continue an existing one with the AI Agent.

**Endpoint**: `POST /api/chat/message`

**Headers**:

```http
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:

```json
{
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "What is the current air quality in the building?",
  "conversation_id": "optional-conversation-uuid",
  "context": {
    "current_page": "dashboard",
    "zone_id": "optional-zone-uuid",
    "alert_id": "optional-alert-uuid"
  }
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "message_id": "7915a4fc-06cb-40b1-b1cc-4908c7769e36",
    "conversation_id": "1fa0ba20-71a0-4773-80c4-c4edfd3acd26",
    "response": "Currently, there are three active alerts related to air quality...",
    "metadata": {
      "openai_metadata": {
        "model": "gpt-4",
        "usage": {
          "total_tokens": 457,
          "prompt_tokens": 343,
          "completion_tokens": 114
        }
      }
    },
    "created_at": "2025-07-31T00:20:34.574Z"
  }
}
```

### 2. Get Conversation History

Retrieve messages from a specific conversation.

**Endpoint**: `GET /api/chat/conversations/{conversationId}/messages`

**Query Parameters**:

- `limit` (optional): Number of messages to retrieve (default: 50)
- `offset` (optional): Number of messages to skip (default: 0)

**Response**:

```json
{
  "success": true,
  "data": {
    "conversation_id": "1fa0ba20-71a0-4773-80c4-c4edfd3acd26",
    "messages": [
      {
        "id": "msg-1",
        "message_type": "user",
        "content": "What is the air quality?",
        "created_at": "2025-07-31T00:20:30.000Z"
      },
      {
        "id": "msg-2",
        "message_type": "assistant",
        "content": "Currently, there are three active alerts...",
        "metadata": {
          "openai_metadata": {
            "usage": { "total_tokens": 457 }
          }
        },
        "created_at": "2025-07-31T00:20:34.574Z"
      }
    ],
    "total": 2,
    "has_more": false
  }
}
```

### 3. Get User Conversations

List all conversations for the authenticated user.

**Endpoint**: `GET /api/chat/conversations`

**Query Parameters**:

- `building_id` (required): Building UUID
- `limit` (optional): Number of conversations (default: 20)
- `offset` (optional): Number to skip (default: 0)

**Response**:

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "1fa0ba20-71a0-4773-80c4-c4edfd3acd26",
        "title": "Air Quality Discussion",
        "building_id": "550e8400-e29b-41d4-a716-446655440000",
        "created_at": "2025-07-31T00:20:30.000Z",
        "updated_at": "2025-07-31T00:25:15.000Z",
        "message_count": 8,
        "last_message": "The humidity levels have improved significantly..."
      }
    ],
    "total": 1,
    "has_more": false
  }
}
```

### 4. Delete Conversation

Clear/delete a conversation and all its messages.

**Endpoint**: `DELETE /api/chat/conversations/{conversationId}`

**Response**:

```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

---

## AI Agent Capabilities

### Building Context Awareness

The AI Agent understands:

- **Building Information**: Name, location, operational status
- **Zone Data**: Multiple zones with different air quality conditions
- **Active Alerts**: Current air quality issues and their severity
- **Historical Patterns**: Trends and previous issues
- **System Status**: HVAC, ventilation, and sensor systems

### Air Quality Analysis

The AI can analyze and explain:

- **PM2.5 Levels**: Particulate matter and health impacts
- **CO2 Concentration**: Indoor air quality and occupancy effects
- **TVOC (Total Volatile Organic Compounds)**: Chemical pollutants
- **Temperature & Humidity**: Comfort and health implications
- **Atmospheric Pressure**: Environmental conditions

### Alert Management

- **Alert Identification**: Recognizes and explains current alerts
- **Severity Assessment**: Understands critical, poor, moderate, and good statuses
- **Resolution Guidance**: Provides step-by-step solutions
- **Preventive Measures**: Suggests actions to prevent future issues

### Recommendations & Actions

- **Immediate Actions**: Quick fixes for urgent issues
- **System Adjustments**: HVAC and ventilation recommendations
- **Timeline Estimates**: Expected improvement timeframes
- **Monitoring Suggestions**: What to watch and when to act

### Conversation Features

- **Context Retention**: Remembers previous messages in conversation
- **Follow-up Questions**: Handles clarifications and additional requests
- **Multi-turn Dialogue**: Maintains coherent conversation flow
- **Personalized Responses**: Adapts to user role and permissions

---

## Frontend Implementation Guidelines

### 1. Chat UI Components

#### Basic Chat Interface

```javascript
// React example
const ChatInterface = ({ buildingId }) => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          building_id: buildingId,
          message: message,
          conversation_id: conversationId,
          context: getCurrentPageContext(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setConversationId(data.data.conversation_id);
        setMessages((prev) => [
          ...prev,
          { type: 'user', content: message },
          { type: 'assistant', content: data.data.response },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
};
```

#### Context-Aware Integration

```javascript
// Pass relevant context based on current page
const getCurrentPageContext = () => {
  const pathname = window.location.pathname;
  const context = { current_page: 'dashboard' };

  if (pathname.includes('/zones/')) {
    context.current_page = 'zone_details';
    context.zone_id = extractZoneIdFromPath(pathname);
  } else if (pathname.includes('/alerts/')) {
    context.current_page = 'alerts';
    context.alert_id = extractAlertIdFromPath(pathname);
  } else if (pathname.includes('/analytics')) {
    context.current_page = 'analytics';
  }

  return context;
};
```

### 2. State Management

#### Redux/Zustand Store Structure

```javascript
const chatStore = {
  // Authentication
  authToken: null,
  user: null,

  // Conversations
  conversations: [],
  currentConversation: null,
  messages: [],

  // UI State
  isLoading: false,
  isChatOpen: false,
  error: null,

  // Actions
  login: async (credentials) => {
    /* ... */
  },
  sendMessage: async (message, context) => {
    /* ... */
  },
  loadConversations: async (buildingId) => {
    /* ... */
  },
  loadMessages: async (conversationId) => {
    /* ... */
  },
  clearConversation: async (conversationId) => {
    /* ... */
  },
};
```

### 3. Real-time Features

#### Auto-refresh Token

```javascript
const useAuthToken = () => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const checkTokenExpiry = () => {
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        if (payload.exp < now) {
          setIsExpired(true);
          localStorage.removeItem('authToken');
          setToken(null);
        }
      }
    };

    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [token]);

  return { token, isExpired, setToken };
};
```

#### Message Streaming (Future Enhancement)

```javascript
// Placeholder for potential streaming implementation
const useStreamingMessage = () => {
  const [streamingMessage, setStreamingMessage] = useState('');

  // Could implement Server-Sent Events or WebSocket
  // for real-time message streaming from AI

  return { streamingMessage, isStreaming: false };
};
```

### 4. Error Handling

#### Error Boundary Component

```javascript
const ChatErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  const handleApiError = (error) => {
    if (error.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    } else if (error.status === 500) {
      setError('AI service temporarily unavailable. Please try again.');
    } else {
      setError('An unexpected error occurred.');
    }
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="chat-error">
        <p>{error}</p>
        <button onClick={() => setHasError(false)}>Try Again</button>
      </div>
    );
  }

  return children;
};
```

### 5. Performance Optimization

#### Message Virtualization

```javascript
// For conversations with many messages
import { VariableSizeList as List } from 'react-window';

const VirtualizedMessageList = ({ messages }) => {
  const getItemSize = (index) => {
    // Calculate message height based on content
    return messages[index].content.length > 100 ? 120 : 80;
  };

  const Message = ({ index, style }) => (
    <div style={style}>
      <ChatMessage message={messages[index]} />
    </div>
  );

  return (
    <List height={400} itemCount={messages.length} itemSize={getItemSize}>
      {Message}
    </List>
  );
};
```

#### Debounced Input

```javascript
const useDebouncedSend = (delay = 1000) => {
  const [pendingMessage, setPendingMessage] = useState('');

  const debouncedSend = useCallback(
    debounce((message) => {
      if (message.trim()) {
        sendMessage(message);
      }
    }, delay),
    []
  );

  return { debouncedSend, setPendingMessage };
};
```

---

## Request/Response Examples

### Common Use Cases

#### 1. Initial Air Quality Check

```javascript
// Request
{
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "What is the current air quality status in the building?"
}

// Response
{
  "success": true,
  "data": {
    "response": "Currently, there are three active alerts concerning air quality in the Green Tech Tower:\n\n1. **PM2.5 Levels: Critical** - The PM2.5 levels are considered critical...",
    "conversation_id": "uuid-here",
    "message_id": "uuid-here"
  }
}
```

#### 2. Zone-Specific Query

```javascript
// Request with context
{
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "How is the air quality in this zone?",
  "context": {
    "current_page": "zone_details",
    "zone_id": "zone-uuid-here"
  }
}
```

#### 3. Follow-up Question

```javascript
// Request in existing conversation
{
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "What steps should I take to fix the PM2.5 issue?",
  "conversation_id": "existing-conversation-uuid"
}
```

#### 4. Alert Resolution

```javascript
// Request about specific alert
{
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "How do I resolve the current TVOC alert?",
  "context": {
    "current_page": "alerts",
    "alert_id": "alert-uuid-here"
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2025-07-31T00:20:34.574Z"
  }
}
```

### Common Error Codes

| Code                     | Status | Description                  | Frontend Action          |
| ------------------------ | ------ | ---------------------------- | ------------------------ |
| `INVALID_TOKEN`          | 401    | JWT token expired or invalid | Redirect to login        |
| `INVALID_CREDENTIALS`    | 401    | Login credentials wrong      | Show login error         |
| `CHAT_MESSAGE_ERROR`     | 500    | AI processing failed         | Retry or show error      |
| `VALIDATION_ERROR`       | 400    | Request data invalid         | Show validation errors   |
| `RATE_LIMIT_EXCEEDED`    | 429    | Too many requests            | Show retry delay         |
| `BUILDING_NOT_FOUND`     | 404    | Invalid building ID          | Check building selection |
| `CONVERSATION_NOT_FOUND` | 404    | Invalid conversation ID      | Clear conversation state |

### Frontend Error Handling Strategy

```javascript
const handleApiError = (error, response) => {
  switch (error.code) {
    case 'INVALID_TOKEN':
      // Clear auth state and redirect
      clearAuthToken();
      router.push('/login');
      break;

    case 'CHAT_MESSAGE_ERROR':
      // Show retry option
      showErrorMessage('AI is temporarily unavailable. Please try again.');
      break;

    case 'RATE_LIMIT_EXCEEDED':
      // Show temporary delay
      showErrorMessage('Please wait a moment before sending another message.');
      break;

    default:
      showErrorMessage(error.message || 'An unexpected error occurred.');
  }
};
```

---

## Best Practices

### 1. Authentication Management

- ✅ Store JWT token securely (not in localStorage for production)
- ✅ Handle token expiry gracefully
- ✅ Implement automatic logout on 401 errors
- ✅ Use refresh tokens when available

### 2. User Experience

- ✅ Show typing indicators during AI response
- ✅ Implement message streaming for long responses
- ✅ Provide suggested questions/prompts
- ✅ Save conversation history locally for offline viewing
- ✅ Implement "quick actions" buttons for common tasks

### 3. Performance

- ✅ Debounce user input to prevent rapid API calls
- ✅ Implement message virtualization for long conversations
- ✅ Cache conversation lists to reduce API calls
- ✅ Optimize context data - only send relevant information

### 4. Error Recovery

- ✅ Implement retry logic with exponential backoff
- ✅ Store unsent messages for retry after network recovery
- ✅ Provide offline indicators and graceful degradation
- ✅ Log errors for debugging and monitoring

### 5. Security

- ✅ Validate all user inputs before sending to API
- ✅ Sanitize AI responses before rendering (prevent XSS)
- ✅ Implement rate limiting on frontend to prevent abuse
- ✅ Never log or store authentication tokens

### 6. Accessibility

- ✅ Implement proper ARIA labels for screen readers
- ✅ Support keyboard navigation in chat interface
- ✅ Provide text alternatives for any visual indicators
- ✅ Ensure sufficient color contrast for readability

---

## Environment Setup

### Required Environment Variables

For the backend to function properly, ensure these environment variables are set:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Chat Service Configuration
CHAT_HISTORY_RETENTION_DAYS=365
CHAT_MAX_MESSAGES_PER_SESSION=50
CHAT_RATE_LIMIT_PER_MINUTE=20

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_building_iaq
DB_USER=iaq_admin
DB_PASSWORD=your-password-here

# Authentication
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
JWT_EXPIRES_IN=24h
```

### Database Requirements

Ensure the following tables exist (use the provided migration):

- `users` - User authentication
- `user_sessions` - Session management
- `buildings` - Building data
- `zones` - Zone information (optional)
- `alerts` - Alert data (optional)
- `chat_conversations` - Conversation metadata
- `chat_messages` - Individual messages

### Frontend Environment

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001

# Feature Flags
REACT_APP_ENABLE_CHAT=true
REACT_APP_ENABLE_STREAMING=false
REACT_APP_MAX_MESSAGE_LENGTH=1000
```

---

## Quick Start Checklist

### Frontend Integration

- [ ] Implement authentication flow
- [ ] Create chat UI components
- [ ] Add error handling and loading states
- [ ] Test with different user scenarios
- [ ] Implement conversation persistence
- [ ] Add accessibility features

### Testing

- [ ] Test token expiry handling
- [ ] Test network error recovery
- [ ] Test long conversation performance
- [ ] Test different building contexts
- [ ] Test mobile responsiveness
- [ ] Test screen reader compatibility

---
