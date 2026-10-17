import { useState } from 'react';
import socket from '../lib/socket';

export default function TaskList({ roomId, userId, userName }) {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState('');

  // Listen for task updates from socket
  useState(() => {
    const onRoomState = (state) => {
      // Tasks come through regular state
    };

    const onTasksUpdate = ({ tasks: newTasks }) => {
      setTasks(newTasks || []);
    };

    socket.on('tasks-update', onTasksUpdate);
    return () => socket.off('tasks-update', onTasksUpdate);
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newTasks = [...tasks, { text: input.trim(), done: false, id: Date.now(), author: userName }];
    setTasks(newTasks);
    socket.emit('notepad-update', { text: JSON.stringify({ _tasks: newTasks }), userId, userName });
    setInput('');
  };

  const toggleTask = (idx) => {
    const next = [...tasks];
    next[idx] = { ...next[idx], done: !next[idx].done };
    setTasks(next);
  };

  const deleteTask = (idx) => {
    const next = tasks.filter((_, i) => i !== idx);
    setTasks(next);
  };

  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-3">
        Shared Ideas & Tasks
      </h3>

      <div className="max-h-44 overflow-y-auto flex flex-col gap-1.5 mb-3 pr-1">
        {tasks.length === 0 ? (
          <div className="text-center text-text-dim text-xs py-4">
            No shared ideas yet. Add one below!
          </div>
        ) : (
          tasks.map((task, i) => (
            <div key={task.id || i} className={`flex items-center justify-between bg-white/3 border border-border rounded-lg px-3 py-2 text-sm gap-2 ${task.done ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(i)}
                className="accent-ok cursor-pointer w-4 h-4"
              />
              <span className={`flex-1 ${task.done ? 'line-through text-text-dim' : ''}`}>
                {task.text}
              </span>
              <button
                onClick={() => deleteTask(i)}
                className="text-text-dim hover:text-bad cursor-pointer bg-transparent border-none text-sm transition-colors"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add shared idea..."
          maxLength={60}
          className="flex-1 bg-[rgba(10,14,23,0.6)] border border-border rounded-lg px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent placeholder:text-text-dim"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer border border-border bg-white/6 text-text-main hover:bg-white/12 transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  );
}
