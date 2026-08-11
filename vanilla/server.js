const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Generate 50 items to test infinite scroll
let tasks = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Task Item #${i + 1}`
}));
let nextId = 51;

// ==========================================
// PAGINATED REST API ENDPOINT
// ==========================================
app.get('/api/tasks', (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedTasks = tasks.slice(startIndex, endIndex);
    const hasMore = endIndex < tasks.length;

    // Small delay to demonstrate loading state
    setTimeout(() => {
        res.json({
            tasks: paginatedTasks,
            hasMore,
            total: tasks.length,
            page
        });
    }, 400);
});

// CREATE
app.post('/api/tasks', (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Task name is required' });
    }

    const newTask = { id: nextId++, name: name.trim() };
    tasks.unshift(newTask); // Add to beginning
    res.status(201).json(newTask);
});

// DELETE
app.delete('/api/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    tasks = tasks.filter((t) => t.id !== id);
    res.status(200).json({ success: true, id });
});

app.listen(PORT, () => {
    console.log(`✅ Server running with pagination at http://localhost:${PORT}`);
});