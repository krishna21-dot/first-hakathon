# SyncSpace — Real-Time Collaborative Workspace

A full-stack, real-time multiplayer collaborative web application inspired by `https://codebase-website-formation.onrender.com/?room=3xz5kf`.

Built with **React**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, **Socket.io**, **Yjs (CRDT)**, and a resilient database layer (**MongoDB** + **Local Persistent Storage**).

---

## 🚀 Features

### 1. User Entry & Room Join System
- **Landing Screen**: Enter your Display Name and a Unique Room Code (e.g. `3xz5kf`), or click **"+ New Room"** to generate an instant code.
- **URL Parameter Support**: Direct access via `/?room=3xz5kf` or `/room/3xz5kf`.
- **Name Modal**: Automatic prompt for first-time visitors opening a shared link.
- **Quick Controls**: Copy room invite link, switch rooms, or change display name directly from the sticky header.

### 2. Conflict-Free Collaborative Live Notepad (Yjs CRDT)
- **Simultaneous Editing**: True CRDT (Conflict-free Replicated Data Type) synchronization powered by Yjs. Users can type and erase simultaneously on the exact same lines without overwrites or race conditions.
- **Multi-user Presence & Typing Indicator**: Real-time typing status ("*Alice is typing...*").
- **Edit History Drawer**: Full revision history with timestamps, author attribution, and diff notes.
- **Autosave**: Debounced background persistence to database.

### 3. Persistent Shared Room Counter with Action Log
- **Multiplayer Counter**: Synchronized `+1 for Everyone`, `-1`, and `Reset` controls.
- **Activity Log**: Real-time audit trail of every change, who executed it, resulting value, and exact timestamp.

### 4. High-Visibility Room Ambient Accent
- **Interactive Theme Color Swatches**: Instant ambient lighting transformation synced across all participants.
- **Dynamic CSS Glow**: Real-time color updates to background radial glows, borders, buttons, and badges.

### 5. Live Emoji Reactions with User Names
- **Reaction Bar**: Instant reactions (🚀, 🔥, 🎉, 💡, ❤️, 👏, 🤯, 💪).
- **Floating Badges**: Animated emojis that float up on all connected screens carrying the sender's display name.

### 6. Multiplayer Live Cursors
- **Real-time Pointer Tracking**: Mouse pointers and name tags of all active peers move across the screen in real-time.

### 7. Live Shoutouts Broadcast System
- **Real-time Feed**: Dedicated message feed for announcements, praise, and room chat with author badges.

### 8. Interactive Workspace Panel (3-in-1)
- **🎯 Live Quiz Creator & Player**:
  - Create interactive multiple-choice quizzes on the fly.
  - Room members answer questions in real time with immediate correct/incorrect feedback.
  - Live scoring and dynamic leaderboard.
- **📊 Real-time Room Polls**:
  - Create custom polls with multiple choices.
  - Live vote distribution bars and percentages.
- **🎨 Collaborative Whiteboard Canvas**:
  - Freehand drawing canvas with pencil, eraser, stroke width slider, and color palette.
  - Sub-millisecond stroke synchronization and clear canvas control.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Framer Motion, Socket.io-client, Yjs.
- **Backend**: Node.js, Express, Socket.io, Yjs server CRDT document store.
- **Database**: Dual-mode storage engine:
  - **MongoDB**: Connects to `mongodb://localhost:27017/syncspace` (or custom `MONGODB_URI` from `.env`).
  - **Local Persistent Storage**: If MongoDB is not running, automatically persists state to [syncspace_db.json](file:///Users/krishnabalara/Desktop/untitled%20folder%202/server/data/syncspace_db.json) with zero configuration.

---

## 🏃 Running the Application

### 1. Start the Backend Server
```bash
cd server
npm install
npm run dev
```
*Server runs at: `http://localhost:3001`*

### 2. Start the Frontend Client
```bash
cd client
npm install
npm run dev
```
*Frontend runs at: `http://localhost:5173`*

Open multiple browser tabs or windows at `http://localhost:5173/?room=3xz5kf` to experience real-time multiplayer collaboration!
