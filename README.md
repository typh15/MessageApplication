# Messaging App

A full-stack messaging application built with .NET 9 backend and React Native/Expo frontend. Send and receive messages in real-time with multi-platform support for Android, iOS, and Web.

## Project Structure

```
MessagingApp/
├── MessagingApp.Api/          # .NET 9 Backend API
│   ├── Controllers/           # API endpoints (ChatController)
│   ├── Models/               # Data models (ChatMessage, ActiveUser)
│   ├── Repositories/         # Data access layer
│   ├── Requests/             # API request models
│   └── Program.cs            # ASP.NET Core configuration
│
└── MessagingAppClient/        # React Native/Expo Frontend
    ├── src/
    │   ├── app/              # Pages and routing (Expo Router)
    │   ├── components/       # Reusable React components
    │   ├── constants/        # Theme and configuration
    │   ├── hooks/            # Custom React hooks
    │   └── ApiHandler.tsx    # API communication
    └── assets/               # Images and app assets
```

## Features

- **Real-time Messaging**: Send and receive chat messages
- **User Authentication**: Unique ID-based authentication with username registration
- **Active User Tracking**: Track online users and their last active time
- **Multi-Platform**: Works on Android, iOS, and Web
- **Responsive UI**: Dark-themed interface with smooth animations
- **Message History**: Retrieve chat history with timestamp tracking
- **CRUD Operations**: Create, read, update, and delete chat messages

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

### Chat Messages
- **GET** `/chat-messages` - Retrieve all chat messages
- **GET** `/chat-messages/{id}` - Get a specific chat message
- **POST** `/chat-messages` - Send a new message (requires authentication)
- **PUT** `/chat-messages/{id}` - Update an existing message

### Authentication Flow
1. Client submits username and generates/sends unique ID
2. API validates and registers user as active
3. API returns unique ID for future requests
4. Client stores ID in AsyncStorage for session persistence

## Usage

### Sending a Message
1. Launch the app
2. Enter your username (first-time users are automatically registered)
3. Type your message in the input box
4. Tap the send button
5. Messages appear in real-time in the chat interface

### Features in Detail
- **Message Timestamps**: Each message displays local and server timestamps
- **Current User Highlighting**: Messages you send are visually distinguished
- **Auto-scroll**: Chat view automatically scrolls to the latest message
- **Persistent Sessions**: Your username and session ID persist across app restarts

## Project Configuration

### API Configuration
- **appsettings.json**: Production settings
- **appsettings.Development.json**: Development settings
- **CORS**: Enabled for all origins in development

### Client Configuration
- **TypeScript**: Strict null checking enabled
- **Theme**: Dark mode with custom color scheme (see `src/constants/theme.ts`)
- **Router**: File-based routing with Expo Router

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

### Repository Pattern
The backend uses the Repository Pattern for data access:
- `IChatMessageRepository`: Defines chat message operations
- `IActiveUserRepository`: Manages active user sessions
- In-memory implementations for development/testing

### State Management
The frontend uses React Hooks and local state:
- `messageRepo`: Stores chat messages
- `Message_Repo`: Custom repository class for message management
- `useRef`: Used for non-re-rendering state (scroll references)

## Future Enhancements

- Real-time synchronization (WebSockets/SignalR)
- Database integration (replace in-memory storage)
- End-to-end encryption
- Message reactions and reactions
- User profiles and avatars
- Message search functionality
- Notification system
- Direct messaging threads
- Message deletion and editing UI

## License

See LICENSE file for details.

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
