# Messaging App

A full-stack messaging application built with .NET 9 backend and React Native/Expo frontend. Create and join message boards, send and receive messages with real-time polling across Android, iOS, and Web platforms.

## Project Structure

```
MessagingApp/
├── MessagingApp.Api/          # .NET 9 Backend API
│   ├── Controllers/           # API endpoints (ChatController)
│   ├── Models/               # Data models (Messageboard, ChatMessage, ActiveUser)
│   ├── Repositories/         # Data access layer
│   ├── Requests/             # API request models
│   └── Program.cs            # ASP.NET Core configuration
│
└── MessagingAppClient/        # React Native/Expo Frontend
    ├── src/
    │   ├── app/              # Pages and routing (Expo Router)
    │   │   ├── _layout.tsx       # Root layout with Stack navigator
    │   │   ├── index.tsx         # Root redirect to registration
    │   │   ├── registration.tsx  # User registration/login page
    │   │   ├── boards.tsx        # Message board selection and browsing
    │   │   ├── new-board.tsx     # Create new message board
    │   │   └── chat.tsx          # Chat interface for selected board
    │   ├── components/       # Reusable React components
    │   ├── constants/        # Theme and configuration
    │   ├── hooks/            # Custom React hooks
    │   ├── ApiHandler.tsx    # API communication layer
    │   └── MessageRepository.tsx  # Local message storage
    └── assets/               # Images and app assets
```

## Features

- **Message Boards**: Create public*(/private) message boards *(with optional password protection),    * - these features are in active development 
- **Board Management**: Create, join, and browse multiple message boards
- **Real-time Messaging**: Send and receive messages with 1-second polling for live updates
- **User Registration**: Pre-registration flow with persistent username and unique ID storage
- **Active User Tracking**: Track online users and their sessions
- **Multi-Platform**: Works on Android (Expo Go), iOS (Expo Go), and Web
- **Responsive UI**: Dark-themed interface with smooth animations
- **Message History**: Retrieve chat history with server timestamps
- **Session Persistence**: Username and unique ID persist across app restarts via AsyncStorage

## Tech Stack

### Backend
- **Framework**: ASP.NET Core (.NET 9)
- **Language**: C#
- **Architecture**: MVC with Repository Pattern
- **Data Storage**: In-memory repository (development)

### Frontend
- **Framework**: React Native (v0.85.3)
- **Build Tool**: Expo (v56.0.5)
- **Language**: TypeScript
- **Routing**: Expo Router
- **Styling**: React Native StyleSheet
- **State Management**: React Hooks
- **Storage**: AsyncStorage

## Getting Started

### Prerequisites
- **Backend**: .NET 9 SDK
- **Frontend**: Node.js (v18+), npm or yarn
- **Mobile**: Expo Go app (for testing on physical devices)
- **Optional**: Android Studio (for Android emulator) or Xcode (for iOS simulator)

### Installation

#### Backend Setup
```bash
cd MessagingApp.Api
dotnet restore
dotnet build
```

#### Frontend Setup
```bash
cd MessagingAppClient
npm install
```

### Running the Application

#### Backend
```bash
cd MessagingApp.Api
dotnet run
```
The API will start on `https://localhost:7036` (default HTTPS port)

#### Frontend (Development)
```bash
cd MessagingAppClient
npm start
```

Then choose your platform:
- **Android**: Press `a` or run `npm run android`
- **iOS**: Press `i` or run `npm run ios`
- **Web**: Press `w` or run `npm run web`
- **Expo Go**: Scan QR code with Expo Go app

### Build Scripts

Convenient batch files are included for quick builds:
- **Build_Client.bat**: Build the React Native client
- **Build_Run_Api.bat**: Build and run the .NET API
- **Run_Client_Test.bat**: Run the client in test mode

## API Endpoints

### Active Users
- **POST** `/active-users` - Register a new active user
  - Request: `{ "userName": "string" }`
  - Response: `{ "uniqueId": "string", "userName": "string" }`

### Message Boards
- **GET** `/message-boards` - List all available message boards
- **GET** `/message-boards/{boardId}` - Get a specific message board
- **POST** `/message-boards` - Create a new message board
  - Request: `{ "boardName": "string", "visibleToPublic": bool, "passwordProtected": bool, "password": "string" }`
  - Response: `MessageBoard object`
- **POST** `/message-boards/{boardId}/join` - Join a message board
  - Request: `{ "uniqueId": "string" }`

### Chat Messages
- **GET** `/message-boards/{boardId}/messages` - Retrieve all messages for a board
- **POST** `/message-boards/{boardId}/messages` - Send a message to a board
  - Request: `{ "fromUserName": "string", "content": "string", "uniqueId": "string", "localTimestamp": "ISO8601", "toUserName": "string" }`
  - Response: `{ "message": ChatMessage object, "uniqueId": "string" }`
- **DELETE** `/message-boards/{boardId}/messages/{messageId}` - Delete a message

### Authentication Flow
1. User enters username on registration screen
2. Client calls `POST /active-users` to register user and obtain `uniqueId`
3. Client stores `uniqueId` and `username` in AsyncStorage for persistence
4. Client can then join boards and send messages using the persisted `uniqueId`
5. Login page allows returning users to access their account using saved `uniqueId`

## Usage

### First-Time User (Registration)
1. Launch the app
2. Enter your desired username on the registration screen
3. Tap "Register" to create your account (generates and stores unique ID)
4. You're automatically navigated to the boards selection screen

### Returning User (Login)
1. Launch the app (starts at registration screen)
2. Tap "Login" to access your account using your saved unique ID
3. Navigated to boards selection screen

### Using the App
1. **Browse Boards**: View available public message boards on the boards screen
2. **Create Board**: Tap "New Board" to create a new board (optionally password-protected)
3. **Join Board**: Tap "Join" on any board to enter the chat
4. **Send Messages**: Type a message and tap Send to post it to the board
5. **Real-Time Updates**: New messages are automatically loaded every second via polling

### Features in Detail
- **Message Timestamps**: Each message displays local and server timestamps
- **User Attribution**: Messages show the sender's username
- **Auto-Scroll**: Chat view automatically scrolls to the latest message
- **Persistent Sessions**: Your username and unique ID persist across app restarts

## Project Configuration

### API Configuration
- **appsettings.json**: Production settings
- **appsettings.Development.json**: Development settings with CORS enabled for all origins
- **Default Port**: API runs on `https://localhost:7036`

### Client Configuration
- **Server URL**: Currently hardcoded in `ApiHandler.tsx` (TODO: move to environment config)
- **TypeScript**: Strict null checking enabled
- **Theme**: Dark mode with custom color scheme (see `src/constants/theme.ts`)
- **Router**: File-based routing with Expo Router
- **Storage**: AsyncStorage for persistent user session data (username, uniqueId)

## Development

### Code Quality
```bash
# Run linting on the client
cd MessagingAppClient
npm run lint
```

### Reset Project
If you need to reset the client to a clean state:
```bash
cd MessagingAppClient
npm run reset-project
```

### Adding Dependencies

**Backend** (C#):
```bash
cd MessagingApp.Api
dotnet add package <package-name>
```

**Frontend** (npm):
```bash
cd MessagingAppClient
npm install <package-name>
```

## Architecture Notes

### Backend (C#/.NET 9)
**Repository Pattern** for data persistence:
- `IChatService`: Main service interface for all chat operations
- `IMessageBoardRepository`: Board CRUD and retrieval operations
- `IActiveUserRepository`: Active user session management
- In-memory implementations for development

**Key Models**:
- `ChatMessage`: Represents a single message with timestamps and user info
- `MessageBoard`: Represents a message board with visibility and password settings
- `ActiveUser`: Represents an online user with unique ID

### Frontend (React Native/TypeScript)
**Navigation & Routing**:
- Expo Router with file-based routing in `src/app/`
- Stack navigator with `_layout.tsx` managing the route stack
- Routes: registration → boards → chat/new-board

**State Management**:
- React Hooks (`useState`, `useEffect`) for component state
- `AsyncStorage` for persistent user data (username, uniqueId)
- Local message repository (`Message_Repo`) for chat state
- `ApiHandler.tsx` as centralized API communication layer

**Message Polling**:
- `useEffect` with `setInterval` polls `fetchMessages()` every second
- Automatic cleanup with `clearInterval` on component unmount
- Updates local message state and scrolls to latest message

**Data Models**:
- `Message_Class`: Client-side chat message representation
- `MessageBoard`: Board metadata with visibility/password flags

## Future Enhancements

Highest Priority - 
- **Private and Password Protected Boards**: Finish this feature
- **Make UI Acceptable**: It's ugly but it works, would like to have it look good and work

High Priority - 
- **Database Integration**: Replace in-memory storage with persistent database (SQL Server, PostgreSQL)
- **Direct Messaging**: One-on-one private message threads(Private message boards with automatic naming, and a max usercount of 2) 
- **Message Editing/Deletion**: Edit sent messages and delete with soft-delete support
- **Notifications**: Push notifications for new messages and board activity
  
Mid Priority - 
- **Encryption**: End-to-end encryption
  
Low Prioriry
- **Admin Panel**: Board moderation and user management tools

## License

See LICENSE file for details.

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
