// ============================================================
// FILE SYSTEM SIMULATOR — NODE.JS SERVER
// server/server.js
//
// This server is the bridge between the frontend (browser) and
// the C++ backend (fs_simulator). Every user action triggers an
// HTTP request, which this server translates into a command,
// executes the C++ binary, captures JSON output, and sends it back.
//
// HOW IT WORKS:
//   1. User clicks button in browser
//   2. Frontend sends HTTP request to /create, /delete, /crash, etc.
//   3. Server constructs argv for the C++ binary
//   4. exec() runs the binary as a subprocess
//   5. stdout (JSON) is parsed and sent back to browser
//   6. Frontend calls updateUI() with the response
//
// CRITICAL: The C++ binary MUST output valid JSON and nothing else.
// Any stray cout, log, or error message breaks the JSON parse.
// ============================================================

const express = require('express');
const { exec } = require('child_process');
const path = require('path');

// ============================================================
// SETUP
// ============================================================
const app = express();
const PORT = 3002; 

// Get the absolute path to the C++ binary
// On Windows: ../backend/fs_simulator.exe
// On Unix: ../backend/fs_simulator
const binPath = path.join(__dirname, '../backend/fs_simulator.exe');

// Middleware: parse incoming JSON in request bodies
app.use(express.json());

// Middleware: serve static files (HTML, CSS, JS) from ../frontend
// This makes index.html accessible at http://localhost:3000
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================
// FUNCTION: runCommand(cmd, res)
//
// Executes a shell command (the C++ binary) and returns JSON.
// This is the glue between HTTP and the subprocess.
//
// Parameters:
//   cmd  : full shell command string (e.g., "./fs_simulator CREATE myfile 5")
//   res  : Express response object to send the JSON back
//
// Flow:
//   1. exec() spawns the subprocess
//   2. Capture stdout (the JSON output)
//   3. Try JSON.parse(stdout)
//   4. If parse succeeds → send it back to browser
//   5. If parse fails → send fallback error JSON
//
// The fallback exists because if the C++ binary is missing,
// not compiled, or has a bug that prints extra output,
// we still want to return valid JSON to the browser so it
// doesn't crash with a parse error.
// ============================================================
function runCommand(cmd, res) {
    exec(cmd, { cwd: path.join(__dirname, '../backend') }, (err, stdout, stderr) => {
        try {
            // Trim whitespace and parse the JSON output
            const data = JSON.parse(stdout.trim());
            // Send the parsed JSON back to the browser
            res.json(data);
        } catch (parseErr) {
            // If JSON parse failed, return a safe fallback
            // This prevents the entire system from crashing if the C++ output is malformed
            console.error("JSON parse error:", parseErr.message);
            console.error("stdout was:", stdout);
            console.error("stderr was:", stderr);

            // Return a default error state to the browser
            res.json({
                status: "error",
                message: "Command execution failed — check C++ binary output",
                disk: Array(50).fill(0),  // empty disk
                files: {}                 // no files
            });
        }
    });
}

// ============================================================
// ENDPOINT: POST /create
//
// Creates a new file with contiguous allocation.
// The C++ engine handles all the allocation logic.
//
// Request body: { "name": "myfile", "size": 5 }
// Response: { "status": "success"|"error", "disk": [...], "files": {...} }
// ============================================================
app.post('/create', (req, res) => {
    const { name, size } = req.body;

    // Validate input
    if (!name || size === undefined) {
        return res.json({
            status: "error",
            message: "Missing 'name' or 'size' in request body",
            disk: Array(50).fill(0),
            files: {}
        });
    }

    // Additional validation: filename should not have spaces or special chars
    // This prevents shell injection and argument parsing issues
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
        return res.json({
            status: "error",
            message: "Invalid filename — use only alphanumeric, underscore, dot, or dash",
            disk: Array(50).fill(0),
            files: {}
        });
    }

    // Parse size as integer
    const sizeInt = parseInt(size);
    if (isNaN(sizeInt) || sizeInt <= 0) {
        return res.json({
            status: "error",
            message: "Size must be a positive integer",
            disk: Array(50).fill(0),
            files: {}
        });
    }

    // Construct the command: "fs_simulator.exe CREATE <name> <size>"
    // Using absolute path via binPath variable defined at top
    const cmd = `"${binPath}" CREATE ${name} ${sizeInt}`;

    // Execute the command and return JSON response
    runCommand(cmd, res);
});

// ============================================================
// ENDPOINT: POST /delete
//
// Deletes a file and frees all its blocks.
//
// Request body: { "name": "myfile" }
// Response: { "status": "success"|"error", "disk": [...], "files": {...} }
// ============================================================
app.post('/delete', (req, res) => {
    const { name } = req.body;

    // Validate input
    if (!name) {
        return res.json({
            status: "error",
            message: "Missing 'name' in request body",
            disk: Array(50).fill(0),
            files: {}
        });
    }

    // Validate filename format (same as /create)
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
        return res.json({
            status: "error",
            message: "Invalid filename",
            disk: Array(50).fill(0),
            files: {}
        });
    }

    // Construct the command: "fs_simulator.exe DELETE <name>"
    const cmd = `"${binPath}" DELETE ${name}`;

    // Execute the command
    runCommand(cmd, res);
});

// ============================================================
// ENDPOINT: POST /crash
//
// Simulates a system crash by corrupting the disk state.
// The C++ engine uses rand() to randomly corrupt files/blocks.
// The backup is never touched, so recovery is always possible.
//
// Request body: {} (empty, no parameters needed)
// Response: { "status": "success", "disk": [corrupted...], "files": {...} }
// ============================================================
app.post('/crash', (req, res) => {
    // No input validation needed — crash takes no parameters

    // Construct the command: "fs_simulator.exe CRASH"
    const cmd = `"${binPath}" CRASH`;

    // Execute the command
    runCommand(cmd, res);
});

// ============================================================
// ENDPOINT: POST /recover
//
// Restores the system to the last known good state (backup).
// The C++ engine reads backup_disk.txt and backup_files.txt.
//
// Request body: {} (empty, no parameters needed)
// Response: { "status": "success", "disk": [restored...], "files": {...} }
// ============================================================
app.post('/recover', (req, res) => {
    // No input validation needed — recover takes no parameters

    // Construct the command: "fs_simulator.exe RECOVER"
    const cmd = `"${binPath}" RECOVER`;

    // Execute the command
    runCommand(cmd, res);
});

// ============================================================
// ENDPOINT: GET /state
//
// Fetches the current system state without making any changes.
// Used for the "Refresh" button.
//
// Request body: none (GET request)
// Response: { "status": "success", "disk": [...], "files": {...} }
// ============================================================
app.get('/state', (req, res) => {
    // Construct the command: "fs_simulator.exe SHOW"
    const cmd = `"${binPath}" SHOW`;

    // Execute the command
    runCommand(cmd, res);
});

// ============================================================
// STARTUP
//
// Start listening on PORT 3000.
// Once running, open http://localhost:3000 in the browser.
// ============================================================
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║       FILE SYSTEM SIMULATOR — NODE.JS SERVER               ║
╚════════════════════════════════════════════════════════════╝

✓ Server running on http://localhost:3000
✓ Static files served from: ../frontend
✓ C++ binary path: ../backend/fs_simulator

Open your browser and navigate to http://localhost:3000

Endpoints:
  POST /create     — create a file
  POST /delete     — delete a file
  POST /crash      — simulate crash
  POST /recover    — recover from backup
  GET  /state      — fetch current state

Press Ctrl+C to stop the server.
    `);
});