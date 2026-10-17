import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';
import * as Y from 'yjs';

function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

const SERVER_URL = 'http://localhost:3001';
const ROOM_ID = '3xz5kf';

console.log('🧪 Starting End-to-End Multi-User Real-Time Test on Room:', ROOM_ID);

async function runTests() {
  const aliceSocket = io(SERVER_URL);
  const bobSocket = io(SERVER_URL);

  let passedTests = 0;

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    aliceSocket.on('connect', check);
    bobSocket.on('connect', check);
  });
  console.log('✅ 1. Alice & Bob connected to server successfully');
  passedTests++;

  // Test 2: Join room & receive state
  await new Promise((resolve) => {
    let stateReceived = 0;
    aliceSocket.on('room-state', (state) => {
      console.log('   Alice received room-state:', state.notepadContent !== undefined, 'counter:', state.counterValue);
      stateReceived++;
      if (stateReceived === 2) resolve();
    });
    bobSocket.on('room-state', (state) => {
      console.log('   Bob received room-state:', state.notepadContent !== undefined, 'counter:', state.counterValue);
      stateReceived++;
      if (stateReceived === 2) resolve();
    });

    aliceSocket.emit('join-room', { roomId: ROOM_ID, userId: 'user-alice', userName: 'Alice' });
    bobSocket.emit('join-room', { roomId: ROOM_ID, userId: 'user-bob', userName: 'Bob' });
  });
  console.log('✅ 2. Room state received for both peers');
  passedTests++;

  // Test 3: Counter increment +1
  await new Promise((resolve) => {
    bobSocket.once('counter-update', ({ value, log }) => {
      console.log('   Bob received counter update:', value, 'by', log.userName);
      if (log.userName === 'Alice' && log.actionType === '+1') {
        resolve();
      }
    });
    aliceSocket.emit('counter-action', { actionType: '+1', userId: 'user-alice', userName: 'Alice' });
  });
  console.log('✅ 3. Shared counter increment synced');
  passedTests++;

  // Test 4: Ambient Accent Color change
  await new Promise((resolve) => {
    bobSocket.once('accent-color', ({ color, userName }) => {
      console.log('   Bob received theme accent change:', color, 'from', userName);
      if (color === '#10b981' && userName === 'Alice') resolve();
    });
    aliceSocket.emit('accent-color', { color: '#10b981', userId: 'user-alice', userName: 'Alice' });
  });
  console.log('✅ 4. Ambient accent theme broadcasted');
  passedTests++;

  // Test 5: Live Emoji Reaction
  await new Promise((resolve) => {
    aliceSocket.once('emoji-reaction', ({ emoji, userName }) => {
      console.log('   Alice received reaction badge:', emoji, 'from', userName);
      if (emoji === '🚀' && userName === 'Bob') resolve();
    });
    bobSocket.emit('emoji-reaction', { emoji: '🚀', userId: 'user-bob', userName: 'Bob' });
  });
  console.log('✅ 5. Emoji reaction badge broadcasted');
  passedTests++;

  // Test 6: Yjs CRDT Simultaneous Collaborative Live Notepad
  const aliceDoc = new Y.Doc();
  const bobDoc = new Y.Doc();
  const aliceText = aliceDoc.getText('notepad');
  const bobText = bobDoc.getText('notepad');

  await new Promise((resolve) => {
    // When Bob gets update, apply to his Yjs doc
    bobSocket.once('yjs-update', ({ update }) => {
      const bytes = base64ToUint8Array(update);
      Y.applyUpdate(bobDoc, bytes);
      console.log('   Bob Yjs doc synced text:', JSON.stringify(bobText.toString()));
      if (bobText.toString().includes('Hello from Alice!')) {
        resolve();
      }
    });

    // Alice types in her Yjs doc
    aliceDoc.transact(() => {
      aliceText.insert(0, 'Hello from Alice! ');
    });
    const update = Y.encodeStateAsUpdate(aliceDoc);
    aliceSocket.emit('yjs-update', {
      update: uint8ArrayToBase64(update),
      userId: 'user-alice',
      userName: 'Alice',
    });
  });
  console.log('✅ 6. Yjs CRDT collaborative live notepad sync verified');
  passedTests++;

  // Test 7: Live Shoutout
  await new Promise((resolve) => {
    aliceSocket.once('new-shoutout', (shoutout) => {
      console.log('   Alice received shoutout:', shoutout.userName, ':', shoutout.message);
      if (shoutout.userName === 'Bob' && shoutout.message === 'Great collaboration team!') {
        resolve();
      }
    });
    bobSocket.emit('shoutout', {
      message: 'Great collaboration team!',
      userId: 'user-bob',
      userName: 'Bob',
    });
  });
  console.log('✅ 7. Live shoutout broadcasted and stored');
  passedTests++;

  // Test 8: Live Poll Creation and Vote
  let createdPollId = null;
  await new Promise((resolve) => {
    bobSocket.once('new-poll', (poll) => {
      console.log('   Bob received new poll:', poll.question, 'options:', poll.options.length);
      createdPollId = poll._id;
      resolve();
    });
    aliceSocket.emit('create-poll', {
      question: 'Should we launch SyncSpace today?',
      options: ['Definitely Yes! 🚀', 'Need more coffee ☕'],
      userId: 'user-alice',
      userName: 'Alice',
    });
  });

  await new Promise((resolve) => {
    aliceSocket.once('poll-updated', (updatedPoll) => {
      console.log('   Alice received poll vote update for opt 0:', updatedPoll.options[0].votes.length, 'votes');
      if (updatedPoll.options[0].votes.length === 1) resolve();
    });
    bobSocket.emit('vote-poll', {
      pollId: createdPollId,
      optionIndex: 0,
      userId: 'user-bob',
      userName: 'Bob',
    });
  });
  console.log('✅ 8. Real-time poll creation and live voting verified');
  passedTests++;

  // Test 9: Collaborative Whiteboard Drawing
  await new Promise((resolve) => {
    bobSocket.once('whiteboard-draw', ({ stroke }) => {
      console.log('   Bob received whiteboard stroke points:', stroke.points.length, 'color:', stroke.color);
      if (stroke.color === '#ef4444') resolve();
    });
    aliceSocket.emit('whiteboard-draw', {
      stroke: {
        points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }, { x: 0.3, y: 0.4 }],
        color: '#ef4444',
        size: 4,
        tool: 'pencil',
      },
    });
  });
  console.log('✅ 9. Collaborative Whiteboard canvas stroke sync verified');
  passedTests++;

  // Test 10: Live Cursors
  await new Promise((resolve) => {
    bobSocket.once('cursor-move', (data) => {
      console.log('   Bob received Alice cursor at:', data.x, data.y);
      if (data.userName === 'Alice') resolve();
    });
    aliceSocket.emit('cursor-move', { x: 0.45, y: 0.55 });
  });
  console.log('✅ 10. Multi-user live cursor sync verified');
  passedTests++;

  aliceSocket.disconnect();
  bobSocket.disconnect();

  console.log(`\n🎉 ALL ${passedTests}/10 INTEGRATION TESTS PASSED PERFECTLY!`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
