import React, { useState, useEffect, useRef } from 'react';

// ─── localStorage helpers ────────────────────────────────────────────────────
const STORAGE_KEY = 'farmwise_tasks';

const loadTasks = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveTasks = (tasks) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
        console.error('Failed to save tasks:', e);
    }
};

// ─── Notification Bell (exported so App.jsx can use it) ──────────────────────
export const OverdueBell = () => {
    const [overdueCount, setOverdueCount] = useState(0);
    const [showPopup, setShowPopup] = useState(false);
    const [overdueTitles, setOverdueTitles] = useState([]);
    const popupRef = useRef(null);

    const refresh = () => {
        const tasks = loadTasks();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const overdue = tasks.filter(t => {
            const td = new Date(t.date);
            td.setHours(0, 0, 0, 0);
            return !t.completed && !t.archived && td < now;
        });
        setOverdueCount(overdue.length);
        setOverdueTitles(overdue.map(t => t.title));
    };

    useEffect(() => {
        refresh();
        // Refresh every 60 seconds
        const interval = setInterval(refresh, 60_000);
        // Also listen for storage changes from Reminders saves
        window.addEventListener('farmwise_tasks_updated', refresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('farmwise_tasks_updated', refresh);
        };
    }, []);

    // Close popup when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                setShowPopup(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (overdueCount === 0) return null;

    return (
        <div ref={popupRef} style={{ position: 'relative' }}>
            <div
                id="overdue-bell-btn"
                onClick={() => setShowPopup(p => !p)}
                title={`${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}! Click to see`}
                style={{
                    cursor: 'pointer',
                    fontSize: '22px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    animation: 'bellRing 1.2s ease infinite',
                    userSelect: 'none'
                }}
            >
                🔔
                <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-8px',
                    background: '#e53935',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 2px white'
                }}>
                    {overdueCount > 9 ? '9+' : overdueCount}
                </span>
            </div>

            {showPopup && (
                <div style={{
                    position: 'absolute',
                    top: '38px',
                    right: 0,
                    background: 'white',
                    border: '1px solid #ffcdd2',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    padding: '14px 16px',
                    minWidth: '240px',
                    zIndex: 9999,
                    color: '#333'
                }}>
                    <div style={{ fontWeight: '700', color: '#c62828', marginBottom: '10px', fontSize: '14px' }}>
                        ⚠️ {overdueCount} Overdue Task{overdueCount > 1 ? 's' : ''}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#555' }}>
                        {overdueTitles.map((t, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{t}</li>
                        ))}
                    </ul>
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#888', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                        Go to <b>Daily Schedule</b> to manage tasks.
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Bell ring animation (injected once) ─────────────────────────────────────
if (!document.getElementById('bell-ring-style')) {
    const style = document.createElement('style');
    style.id = 'bell-ring-style';
    style.textContent = `
        @keyframes bellRing {
            0%   { transform: rotate(0deg); }
            10%  { transform: rotate(15deg); }
            20%  { transform: rotate(-12deg); }
            30%  { transform: rotate(10deg); }
            40%  { transform: rotate(-8deg); }
            50%  { transform: rotate(5deg); }
            60%  { transform: rotate(-4deg); }
            70%  { transform: rotate(2deg); }
            80%  { transform: rotate(0deg); }
            100% { transform: rotate(0deg); }
        }
    `;
    document.head.appendChild(style);
}

// ─── Main Reminders Component ─────────────────────────────────────────────────
const Reminders = () => {
    const [tasks, setTasks] = useState(loadTasks);
    const [showModal, setShowModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', date: '', time: '' });
    const [filter, setFilter] = useState('active');
    const [swipedTask, setSwipedTask] = useState(null);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [isDark, setIsDark] = useState(document.body.classList.contains('dark-mode'));
    const [alertMsg, setAlertMsg] = useState(null); // overdue alert banner

    // ── Persist tasks ──────────────────────────────────────────────────────────
    useEffect(() => {
        saveTasks(tasks);
        // Notify the bell component in the navbar
        window.dispatchEvent(new Event('farmwise_tasks_updated'));
    }, [tasks]);

    // ── Dark mode observer ─────────────────────────────────────────────────────
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.body.classList.contains('dark-mode'));
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // ── Overdue check + auto-complete after 1-day grace ────────────────────────
    useEffect(() => {
        const checkOverdue = () => {
            const now = new Date();

            setTasks(prev => {
                let changed = false;
                const updated = prev.map(task => {
                    if (task.completed || task.archived) return task;

                    const deadline = new Date(task.date);
                    // For tasks with time, include it; otherwise end of day
                    if (task.time) {
                        const [h, m] = task.time.split(':');
                        deadline.setHours(parseInt(h), parseInt(m), 0, 0);
                    } else {
                        deadline.setHours(23, 59, 59, 999);
                    }

                    const msOverdue = now - deadline;
                    const oneDayMs = 24 * 60 * 60 * 1000;

                    // Auto-move to completed if 1 day past deadline
                    if (msOverdue > oneDayMs && !task.autoCompleted) {
                        changed = true;
                        return {
                            ...task,
                            completed: true,
                            autoCompleted: true,
                            completedAt: new Date().toISOString(),
                            alertSent: true
                        };
                    }

                    // Show browser notification + alert banner when deadline just passed
                    if (msOverdue > 0 && !task.alertSent) {
                        changed = true;
                        // Browser notification
                        if (Notification.permission === 'granted') {
                            new Notification('⚠️ FarmWise Task Overdue', {
                                body: `"${task.title}" is past its deadline!`,
                                icon: '/favicon.ico'
                            });
                        }
                        return { ...task, alertSent: true };
                    }

                    return task;
                });

                return changed ? updated : prev;
            });
        };

        // Request browser notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        checkOverdue();
        const interval = setInterval(checkOverdue, 30_000); // every 30s
        return () => clearInterval(interval);
    }, []);

    // ── Auto-archive after 30 days ─────────────────────────────────────────────
    useEffect(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        setTasks(prev => prev.map(task => {
            if (task.completed && !task.archived) {
                const completedDate = new Date(task.completedAt || task.date);
                if (completedDate < thirtyDaysAgo) {
                    return { ...task, archived: true };
                }
            }
            return task;
        }));
    }, []);

    // ── Overdue alert banner ───────────────────────────────────────────────────
    const overdueNow = tasks.filter(t => {
        if (t.completed || t.archived) return false;
        const d = new Date(t.date);
        d.setHours(23, 59, 59, 999);
        return new Date() > d;
    });

    // ── Helpers ────────────────────────────────────────────────────────────────
    const inactiveBtnStyle = {
        background: isDark ? '#2a2a2a' : 'white',
        color: isDark ? '#aaa' : '#666',
        border: `2px solid ${isDark ? '#444' : '#ddd'}`,
    };

    const handleAddTask = () => {
        if (!newTask.title || !newTask.date) return;
        const task = {
            id: Date.now(),
            title: newTask.title,
            date: newTask.date,
            time: newTask.time || '',
            completed: false,
            archived: false,
            alertSent: false,
            autoCompleted: false,
            createdAt: new Date().toISOString()
        };
        setTasks(prev => [...prev, task]);
        setNewTask({ title: '', date: '', time: '' });
        setShowModal(false);
    };

    const handleDeleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

    const handleCompleteTask = (id) => {
        setTasks(prev => prev.map(t =>
            t.id === id ? {
                ...t,
                completed: !t.completed,
                autoCompleted: false,
                completedAt: !t.completed ? new Date().toISOString() : null
            } : t
        ));
    };

    const handleArchiveTask = (id) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, archived: !t.archived } : t));
    };

    // ── Swipe ─────────────────────────────────────────────────────────────────
    const minSwipeDistance = 50;
    const onTouchStart = (e, id) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); setSwipedTask(id); };
    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
    const onTouchEnd = (id) => {
        if (!touchStart || !touchEnd) return;
        const dist = touchStart - touchEnd;
        if (dist < -minSwipeDistance) handleCompleteTask(id);
        if (dist > minSwipeDistance) handleDeleteTask(id);
        setSwipedTask(null); setTouchStart(null); setTouchEnd(null);
    };

    // ── Filter ────────────────────────────────────────────────────────────────
    const getFilteredTasks = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return tasks.filter(task => {
            if (filter === 'all') return !task.archived;
            if (filter === 'active') return !task.completed && !task.archived;
            if (filter === 'completed') return task.completed && !task.archived;
            if (filter === 'archived') return task.archived;
            if (filter === 'overdue') {
                const td = new Date(task.date); td.setHours(0, 0, 0, 0);
                return !task.completed && !task.archived && td < today;
            }
            return true;
        });
    };

    const filteredTasks = getFilteredTasks();

    const taskCounts = {
        all: tasks.filter(t => !t.archived).length,
        active: tasks.filter(t => !t.completed && !t.archived).length,
        overdue: tasks.filter(t => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const td = new Date(t.date); td.setHours(0, 0, 0, 0);
            return !t.completed && !t.archived && td < today;
        }).length,
        completed: tasks.filter(t => t.completed && !t.archived).length,
        archived: tasks.filter(t => t.archived).length
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <main className="main" style={{ flexDirection: 'column', alignItems: 'center' }}>

            {/* Overdue Alert Banner */}
            {overdueNow.length > 0 && (
                <div style={{
                    maxWidth: '800px',
                    width: '100%',
                    marginBottom: '16px',
                    marginTop: '8px',
                    background: 'linear-gradient(135deg, #ffebee, #ffcdd2)',
                    border: '1.5px solid #ef9a9a',
                    borderLeft: '5px solid #e53935',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'pulse 2s ease infinite'
                }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>🚨</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: '#c62828', fontSize: '14px', marginBottom: '4px' }}>
                            {overdueNow.length} Overdue Task{overdueNow.length > 1 ? 's' : ''}!
                        </div>
                        <div style={{ fontSize: '13px', color: '#b71c1c' }}>
                            {overdueNow.map(t => `"${t.title}"`).join(', ')} — Please complete or they'll auto-move to Completed in 24 hrs.
                        </div>
                    </div>
                    <button
                        onClick={() => setFilter('overdue')}
                        style={{
                            background: '#e53935', color: 'white', border: 'none',
                            borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
                            fontWeight: '600', fontSize: '13px', flexShrink: 0
                        }}
                    >
                        View
                    </button>
                </div>
            )}

            <div className="title-row" style={{ maxWidth: '800px' }}>
                <div>
                    <h1>Daily Schedule</h1>
                    <p className="subtitle">Never miss a critical task for your crops.</p>
                </div>
                <button className="new-task" onClick={() => setShowModal(true)}>
                    + New Task
                </button>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', maxWidth: '800px', width: '100%', justifyContent: 'center' }}>
                {[
                    { key: 'active', label: 'Active', color: '#1f5135' },
                    { key: 'overdue', label: 'Overdue', color: '#d32f2f' },
                    { key: 'completed', label: 'Completed', color: '#2e7d32' },
                    { key: 'archived', label: 'Archived', color: '#757575' },
                    { key: 'all', label: 'All', color: '#1f5135' },
                ].map(({ key, label, color }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        style={{
                            padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                            fontWeight: '600', fontSize: '14px', transition: 'all 0.2s',
                            ...(filter === key
                                ? { background: color, color: 'white', border: `2px solid ${color}` }
                                : inactiveBtnStyle)
                        }}
                    >
                        {label} ({taskCounts[key]})
                        {key === 'overdue' && taskCounts.overdue > 0 && filter !== 'overdue' && (
                            <span style={{
                                marginLeft: '6px', background: '#e53935', color: 'white',
                                borderRadius: '50%', width: '18px', height: '18px',
                                fontSize: '11px', fontWeight: '700', display: 'inline-flex',
                                alignItems: 'center', justifyContent: 'center'
                            }}>!</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Swipe Hint */}
            {filteredTasks.length > 0 && (
                <div style={{
                    maxWidth: '800px', width: '100%', marginBottom: '10px', padding: '10px',
                    background: isDark ? '#1a2f1e' : '#e8f5e9',
                    borderRadius: '8px', fontSize: '13px',
                    color: isDark ? '#81c784' : '#2e7d32', textAlign: 'center'
                }}>
                    💡 Tip: Swipe right to complete ✓ | Swipe left to delete 🗑️
                </div>
            )}

            {/* Task List */}
            {filteredTasks.length === 0 ? (
                <div className="empty-state">
                    <div className="bell">🔔</div>
                    <h3>No {filter} tasks</h3>
                    <p>{filter === 'active' ? 'Add a task to get started!' : `No ${filter} tasks found.`}</p>
                </div>
            ) : (
                <div className="reminders-list" style={{ maxWidth: '800px' }}>
                    {filteredTasks.map(task => {
                        const isOverdue = !task.completed && !task.archived && new Date(task.date) < new Date();
                        const wasAutoCompleted = task.completed && task.autoCompleted;

                        return (
                            <div
                                key={task.id}
                                className="reminder-item"
                                style={{
                                    opacity: task.completed || task.archived ? 0.7 : 1,
                                    borderLeft: isOverdue
                                        ? '4px solid #d32f2f'
                                        : wasAutoCompleted
                                            ? '4px solid #ff9800'
                                            : task.completed
                                                ? '4px solid #2e7d32'
                                                : '4px solid #1f5135',
                                    position: 'relative',
                                    touchAction: 'pan-y',
                                    background: isOverdue
                                        ? (isDark ? 'rgba(211,47,47,0.08)' : 'rgba(255,235,238,0.6)')
                                        : undefined
                                }}
                                onTouchStart={(e) => onTouchStart(e, task.id)}
                                onTouchMove={(e) => onTouchMove(e, task.id)}
                                onTouchEnd={() => onTouchEnd(task.id)}
                            >
                                <div className="reminder-content">
                                    <h3 style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                                        {task.title}
                                        {task.archived && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#757575' }}>📦 Archived</span>}
                                        {isOverdue && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#d32f2f', fontWeight: '700' }}>⚠️ OVERDUE</span>}
                                        {wasAutoCompleted && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#e65100' }}>🤖 Auto-completed</span>}
                                    </h3>
                                    <p>
                                        Due: {task.date}{task.time ? ` at ${task.time}` : ''}
                                        {wasAutoCompleted && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#e65100' }}>(Missed deadline — moved here automatically)</span>}
                                    </p>
                                </div>
                                <div className="reminder-actions">
                                    <div className="action-icon complete-icon" onClick={() => handleCompleteTask(task.id)} title={task.completed ? 'Mark Incomplete' : 'Mark Complete'}>
                                        ✓
                                    </div>
                                    {!task.archived && (
                                        <div className="action-icon" onClick={() => handleArchiveTask(task.id)} title="Archive Task" style={{ background: '#f5f5f5', color: '#757575' }}>
                                            📦
                                        </div>
                                    )}
                                    {task.archived && (
                                        <div className="action-icon" onClick={() => handleArchiveTask(task.id)} title="Unarchive Task" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                                            ↩️
                                        </div>
                                    )}
                                    <div className="action-icon delete-icon" onClick={() => handleDeleteTask(task.id)} title="Delete Task">
                                        🗑️
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Task Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Add New Task</h2>
                        <input
                            type="text"
                            placeholder="Task Name (e.g., Water Crops)"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        />
                        <input
                            type="date"
                            value={newTask.date}
                            onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                        />
                        <div style={{ marginTop: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                                ⏰ Time (optional — for precise alerts)
                            </label>
                            <input
                                type="time"
                                value={newTask.time}
                                onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="modal-buttons">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAddTask}>Add Task</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Reminders;
