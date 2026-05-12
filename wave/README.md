# Wave

Messaging that feels human. Real-time chat with presence, reactions, quoted replies, read receipts, emoji keyboard, and a warm editorial aesthetic.

## Features

- **Google sign-in** — one click, profile photo carried over
- **Presence** — online (green pulse dot) / away (amber) / offline (gray) / invisible mode
- **Direct messages** — pinnable, unread badges, typing indicators
- **Group rooms** — public or private, member list, admin controls, custom emoji
- **Read receipts** — ✓ sent · ✓✓ delivered · colored ✓✓ seen (IntersectionObserver)
- **Reactions** — quick bar + full emoji picker, animated spring pills, tooltip with names
- **Quoted replies** — click-to-jump to original, animated reply composer
- **Unsend for everyone** — no time limit, placeholder preserved, reactions cleared
- **Edit messages** — shows "(edited)" label after edit
- **Emoji keyboard** — emoji-mart full picker + `:shortcode:` autocomplete in composer
- **File attachments** — drag-drop or paste images, lightbox expand, file download cards
- **Link previews** — OG title, description, thumbnail via edge API
- **Rich text** — bold, italic, inline code, fenced code blocks with syntax highlighting
- **Push notifications** — browser push for DMs and mentions
- **PWA** — installable, manifest included
- **Mobile responsive** — slide-out sidebar, full single-panel layout

## Stack

Next.js 15 · TypeScript · Tailwind CSS v4 · Firebase (Firestore + RTDB + Storage + Auth) · Framer Motion · emoji-mart · highlight.js · date-fns

## Quick start

### 1. Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Authentication** → Sign-in method → enable **Google**
3. **Firestore Database** → Create in production mode
4. **Realtime Database** → Create (any region)
5. **Storage** → Get started
6. Project Settings → Your apps → Add web app → copy config

### 2. Environment variables

```
cp .env.local.example .env.local
# then fill in your Firebase config values
```

`.env.local` keys:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
```

### 3. Deploy security rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,database,storage
```

Or paste `firestore.rules`, `database.rules.json`, and `storage.rules` into the Firebase console manually.

### 4. Firestore indexes (create once via console or Firebase CLI)

| Collection | Fields |
|---|---|
| `rooms` | `members` array-contains, `updatedAt` desc |
| `dms` | `participants` array-contains, `lastMessageAt` desc |
| `notifications` | `recipientId` asc, `createdAt` desc |
| `rooms/{id}/messages` | `createdAt` desc |

Run the app once and Firebase will show direct links to create any missing indexes.

### 5. Run

```bash
pnpm dev
# http://localhost:3000
```

## Architecture

```
lib/presence.ts    — Online/away/offline/invisible, onDisconnect, activity listeners
lib/typing.ts      — Typing indicators with 3s TTL, RTDB onDisconnect cleanup
lib/hooks/
  useAuth.ts       — Google auth, profile create/update, needsUsername flag
  useMessages.ts   — Firestore messages CRUD, pagination, reactions, seenBy
  useRooms.ts      — Rooms CRUD, public room discovery
  useDMs.ts        — DM conversations, getOrCreateDM
  useNotifications.ts — In-app notifications, push permission

components/
  layout/AppShell.tsx      — Three-panel layout + mobile drawer
  layout/Sidebar.tsx       — DMs list, rooms list, user panel, presence dot
  messages/ChatArea.tsx    — Wires MessageList + Composer + modals
  messages/MessageItem.tsx — Message with action bar, reactions, read receipts
  messages/Composer.tsx    — Textarea, emoji picker, file upload, reply preview
  messages/MessageList.tsx — Scroll management, date headers, sender collapse
  messages/TypingIndicator.tsx — Animated three-dot indicator from RTDB
  messages/ReactionPills.tsx   — Animated spring reaction chips with tooltips
```

## Presence details

Written to Firebase RTDB (`presence/{uid}`) so `onDisconnect()` guarantees offline state when tab closes — Firestore alone can't do this. Idle detection: `mousemove`/`keydown`/`scroll` listeners → 2 min without activity = away. Invisible mode writes `offline` to RTDB so others see offline, but the app itself continues working normally.

## Read receipts

Stored as `messages/{id}.seenBy.{uid}: timestamp`. IntersectionObserver fires when a message enters the viewport (threshold: 50%) on the recipient's screen and writes the seen timestamp. Only fires once per message. The sender's UI shows the ✓✓ colored receipt for that message.

## Typing indicators

`typing/{roomId}/{uid}` in RTDB, auto-expired: client clears after 3s of no keystrokes, `onDisconnect().remove()` clears on tab close. Subscriber filters entries older than 4.5s to handle missed cleanups gracefully.
