const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory Server Database
let serverDatabase = [];

// Helper utility to log database status on every change
function logDatabaseState(action) {
    console.log(`\n========================================`);
    console.log(`⚡ ACTION: ${action}`);
    console.log(`📦 TOTAL ITEMS IN DB: ${serverDatabase.length}`);
    console.log(`📋 CURRENT DB CONTENT:`);
    console.table(serverDatabase);
    console.log(`========================================\n`);
}

// -------------------------------------------------------------
// 1. READ ALL (GET /api/tasks) - For initial load / sync
// -------------------------------------------------------------
app.get('/api/tasks', (req, res) => {
    res.json({ success: true, tasks: serverDatabase });
});

// -------------------------------------------------------------
// 2. BATCH SYNC / CREATE / UPDATE (POST /api/sync)
// -------------------------------------------------------------
app.post('/api/sync', (req, res) => {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
        return res.status(400).json({ success: false, error: 'Expected tasks array' });
    }

    const syncedIds = [];

    tasks.forEach(task => {
        const existingIndex = serverDatabase.findIndex(t => t.id === task.id);
        const updatedTask = { ...task, synced: 1, updatedAt: Date.now() };

        if (existingIndex > -1) {
            serverDatabase[existingIndex] = updatedTask;
        } else {
            serverDatabase.push(updatedTask);
        }
        syncedIds.push(task.id);
    });

    logDatabaseState('BATCH SYNC / CREATE / UPDATE');
    res.json({ success: true, syncedIds });
});

// -------------------------------------------------------------
// 3. UPDATE SINGLE ITEM (PUT /api/tasks/:id)
// -------------------------------------------------------------
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const index = serverDatabase.findIndex(t => t.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Task not found' });
    }

    serverDatabase[index] = { ...serverDatabase[index], ...updates, updatedAt: Date.now() };

    logDatabaseState(`UPDATE TASK [${id}]`);
    res.json({ success: true, task: serverDatabase[index] });
});

// -------------------------------------------------------------
// 4. DELETE SINGLE ITEM (DELETE /api/tasks/:id)
// -------------------------------------------------------------
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const initialCount = serverDatabase.length;

    serverDatabase = serverDatabase.filter(t => t.id !== id);

    if (serverDatabase.length === initialCount) {
        return res.status(404).json({ success: false, error: 'Task not found' });
    }

    logDatabaseState(`DELETE TASK [${id}]`);
    res.json({ success: true, deletedId: id });
});

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Node CRUD & Sync Server running on http://localhost:${PORT}`);
    logDatabaseState('SERVER STARTUP');
});