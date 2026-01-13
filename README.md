# ChatterBox - Real-time Messaging Application

A modern, feature-rich real-time chat application with clean UI/UX inspired by modern messaging apps.

## 🚀 Features

### Authentication
- **Phone-based Login**: Users log in with phone number and password
- **User Profiles**: Each user has a username, bio, and avatar
- **Secure Password Storage**: Bcrypt password hashing

### Contact Management
- **Search Users by Phone**: Find users by their phone number
- **Add Contacts**: Save contacts with custom display names
- **Contact List**: View all your saved contacts
- **Delete Contacts**: Remove contacts you no longer need

### Real-time Messaging
- **1-to-1 Chat**: Private messaging between users
- **WebSocket Communication**: Real-time message delivery
- **Message Persistence**: Messages stored in ScyllaDB
- **Message Routing**: Messages only sent to sender and receiver
- **Read Receipts**: Double checkmarks for sent messages
- **Chat History**: Persistent chat history across sessions

### Calls (WebRTC)
- **Voice Calls**: Real-time audio calls
- **Video Calls**: Real-time video calls
- **Call Sounds**: Dialing, ringtone, and connection tones

### UI/UX
- **Modern Design**: Clean, elegant interface
- **Dark Theme**: Easy on the eyes
- **Responsive Layout**: Works on all screen sizes
- **Resizable Sidebar**: Drag to resize chat list
- **Smooth Animations**: Polished transitions
- **Custom Scrollbars**: Native-looking scroll behavior
- **Empty States**: Helpful messages when no contacts or chats

## 🛠️ Technology Stack

### Backend
- **Go (Golang)**: High-performance server
- **Fiber**: Fast web framework
- **MongoDB**: User and contact data storage
- **ScyllaDB**: Message persistence
- **Redis**: Online presence tracking
- **WebSocket**: Real-time communication

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe code
- **Zustand**: Lightweight state management
- **Axios**: HTTP client
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Beautiful, consistent icons

## 📦 Project Structure

```
ChatterBox/
├── server/
│   ├── cmd/api/main.go         
│   └── internal/
│       ├── auth/               
│       ├── chat/              
│       ├── contacts/           
│       ├── db/                  
│       ├── messages/           
│       ├── middleware/         
│       └── models/             
└── client/
    ├── app/                    
    │   ├── login/
    │   ├── signup/
    │   └── page.tsx           
    ├── components/            
    │   ├── ChatSidebar.tsx   
    │   ├── ChatWindow.tsx    
    │   ├── CallModalWebRTC.tsx 
    │   └── ResizablePanel.tsx 
    └── lib/
        ├── store.ts         
        ├── sounds.ts         
        └── webrtc.ts        
```

## 🚦 Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- Docker (for databases)

### 1. Start Databases

```bash
docker-compose up -d
```

This starts MongoDB, ScyllaDB, and Redis.

### 2. Start Backend

```bash
cd server
go mod download
go run cmd/api/main.go
```

Backend runs on `http://localhost:8080`

### 3. Start Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

## 📱 How to Use

### 1. Sign Up
- Enter your display name
- Enter your phone number (e.g., +1234567890)
- Add a bio (optional)
- Create a password

### 2. Log In
- Enter your phone number
- Enter your password

### 3. Add Contacts
- Click the "+" icon in the sidebar
- Enter a phone number to search
- Customize the display name
- Click "Add Contact"

### 4. Start Chatting
- Select a contact from the sidebar
- Type your message
- Press Enter or click Send
- Messages appear in real-time for both users


## 🎨 UI Features

- **Clean Message Bubbles**: Rounded corners, proper spacing, timestamps
- **User Avatars**: Generated from initials with DiceBear API
- **Status Indicators**: Online/offline presence (Redis-backed)
- **Smooth Scrolling**: Auto-scroll to latest messages
- **Responsive Input**: Dynamic send button styling
- **Professional Colors**: WhatsApp-inspired color palette
  - Background: `#111b21`
  - Sidebar: `#202c33`
  - Input: `#2a3942`
  - Accent: `#00a884`

## 🔐 Security Notes

⚠️ **Current Implementation**: For MVP/development purposes
- Auth uses simple header-based user_id
- In production, implement JWT token validation
- Add rate limiting for API endpoints
- Implement proper CORS policies
- Add input validation and sanitization

## 📝 API Endpoints

### Authentication
- `POST /api/signup` - Register new user
- `POST /api/login` - Login user
- `GET /api/search-user?phone=` - Search user by phone

### Contacts (Requires Auth)
- `POST /api/contacts` - Add new contact
- `GET /api/contacts` - Get all contacts
- `DELETE /api/contacts/:id` - Delete contact

### WebSocket
- `GET /ws?user_id=` - WebSocket connection for real-time chat

## 🐛 Known Issues & Future Enhancements

### To Be Implemented
- [ ] Message history loading from ScyllaDB
- [ ] Image/file sharing
- [ ] Voice messages
- [ ] Group chats
- [ ] Message search
- [ ] User profile editing
- [ ] Notification sounds
- [ ] Typing indicators
- [ ] Last seen timestamps
- [ ] Message reactions (emoji)
- [ ] End-to-end encryption

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

## 📄 License

MIT License - feel free to use this for learning purposes.

---

**Built with ❤️ using Go and Next.js**
