// ============================================================
// FILE SYSTEM SIMULATOR — FRONTEND CONTROLLER
// frontend/script.js
//
// This script manages all user interactions:
//   - Button clicks trigger API calls
//   - API responses update the disk visualization
//   - File list and status messages are kept in sync
//
// All communication with the Node.js backend goes through
// the callAPI() function.
// ============================================================

// ============================================================
// INITIALIZATION
// Fetch and display initial state when page loads
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('File System Simulator loaded');
    
    // Fetch initial state from the server
    refreshState();
    
    // Bind button event listeners
    bindEventListeners();
});

// ============================================================
// FUNCTION: bindEventListeners()
//
// Attaches click handlers to all buttons.
// This runs once on page load.
// ============================================================

function bindEventListeners() {
    // Create File button
    document.getElementById('createBtn').addEventListener('click', () => {
        const filename = document.getElementById('filename').value.trim();
        const filesize = document.getElementById('filesize').value.trim();
        
        // Validate inputs
        if (!filename) {
            showStatus('Error: Please enter a filename', 'error');
            return;
        }
        if (!filesize || parseInt(filesize) <= 0) {
            showStatus('Error: Please enter a valid file size', 'error');
            return;
        }
        
        // Call API
        callAPI('/create', { 
            name: filename, 
            size: parseInt(filesize) 
        });
        
        // Clear inputs on successful submission
        document.getElementById('filename').value = '';
        document.getElementById('filesize').value = '';
    });
    
    // Delete File button
    document.getElementById('deleteBtn').addEventListener('click', () => {
        const filename = document.getElementById('deleteFilename').value.trim();
        
        // Validate input
        if (!filename) {
            showStatus('Error: Please enter a filename to delete', 'error');
            return;
        }
        
        // Call API
        callAPI('/delete', { name: filename });
        
        // Clear input on successful submission
        document.getElementById('deleteFilename').value = '';
    });
    
    // Crash button
    document.getElementById('crashBtn').addEventListener('click', () => {
        callAPI('/crash', {});
    });
    
    // Recover button
    document.getElementById('recoverBtn').addEventListener('click', () => {
        callAPI('/recover', {});
    });
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        refreshState();
    });
}

// ============================================================
// FUNCTION: callAPI(endpoint, body)
//
// Makes an HTTP request to the Node.js server.
// Parses the JSON response and updates the UI.
//
// Parameters:
//   endpoint : string like "/create", "/delete", "/crash"
//   body     : object with request parameters, or {} for no body
//
// Returns: nothing (updates UI directly)
// ============================================================

async function callAPI(endpoint, body) {
    try {
        // Construct the fetch options
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        };
        
        // Make the HTTP request
        const response = await fetch(endpoint, options);
        
        // Parse the JSON response
        const data = await response.json();
        
        // Update the UI with the new state
        updateUI(data);
        
    } catch (error) {
        // Network or parse error
        console.error('API Error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

// ============================================================
// FUNCTION: refreshState()
//
// Fetches the current system state without making changes.
// Used by the Refresh button.
// ============================================================

async function refreshState() {
    try {
        const response = await fetch('/state');
        const data = await response.json();
        updateUI(data);
    } catch (error) {
        console.error('Refresh Error:', error);
        showStatus('Error: Could not fetch state', 'error');
    }
}

// ============================================================
// FUNCTION: updateUI(data)
//
// THE CORE FUNCTION — updates all visual elements based on
// the server response.
//
// The response object has this structure:
// {
//   "status": "success" | "error",
//   "message": "human readable string",
//   "disk": [0, 1, 1, 0, ...],           (50 elements)
//   "files": { "myfile": [2, 3, 4], ... }
// }
//
// This function:
//   1. Updates the status message
//   2. Renders the disk blocks (50 div elements, 10×5 grid)
//   3. Lists all files and their block allocations
// ============================================================

function updateUI(data) {
    if (!data) {
        showStatus('Error: Invalid response from server', 'error');
        return;
    }
    
    // Update status message
    showStatus(data.message || 'State updated', data.status);
    
    // Render disk blocks
    renderDisk(data.disk);
    
    // Render file list
    renderFiles(data.files);
}

// ============================================================
// FUNCTION: renderDisk(disk)
//
// Visualizes the 50-block disk as a grid.
//
// Parameters:
//   disk : array of 50 integers (0 = free, 1 = used)
//
// Creates:
//   - 50 div.disk-block elements in a 10×5 grid
//   - Each block is colored based on its state
//   - Block number is displayed in the center
// ============================================================

function renderDisk(disk) {
    if (!disk || disk.length !== 50) {
        console.error('Invalid disk data:', disk);
        return;
    }
    
    const container = document.getElementById('diskVisualization');
    
    // Clear previous blocks
    container.innerHTML = '';
    
    // Create 50 block elements
    for (let i = 0; i < 50; i++) {
        const block = document.createElement('div');
        block.className = 'disk-block';
        
        // Add state class (free or used)
        if (disk[i] === 0) {
            block.classList.add('free');
        } else if (disk[i] === 1) {
            block.classList.add('used');
        }
        
        // Set the block index as content
        const label = document.createElement('span');
        label.className = 'disk-block-label';
        label.textContent = i;
        block.appendChild(label);
        
        // Add title for hover info
        block.title = `Block ${i} — ${disk[i] === 0 ? 'FREE' : 'USED'}`;
        
        // Append to the grid
        container.appendChild(block);
    }
}

// ============================================================
// FUNCTION: renderFiles(files)
//
// Displays the file directory listing.
//
// Parameters:
//   files : object mapping filename → array of block indices
//   Example: { "notes": [2, 3, 4], "photo": [7, 8] }
//
// Creates:
//   - One div.file-item per file
//   - Shows filename and list of blocks
//   - If no files, shows "No files" message
// ============================================================

function renderFiles(files) {
    const container = document.getElementById('fileList');
    
    // Handle empty file list
    if (!files || Object.keys(files).length === 0) {
        container.innerHTML = '<div class="empty-state">No files. Create one to begin.</div>';
        return;
    }
    
    // Clear previous entries
    container.innerHTML = '';
    
    // Iterate over each file in the directory
    for (const [filename, blocks] of Object.entries(files)) {
        // Create file item container
        const item = document.createElement('div');
        item.className = 'file-item';
        
        // Filename element
        const nameEl = document.createElement('div');
        nameEl.className = 'file-name';
        nameEl.textContent = filename;
        
        // Blocks list element
        const blocksEl = document.createElement('div');
        blocksEl.className = 'file-blocks';
        blocksEl.textContent = `[${blocks.join(', ')}]`;
        
        // Assemble and append
        item.appendChild(nameEl);
        item.appendChild(blocksEl);
        container.appendChild(item);
    }
}

// ============================================================
// FUNCTION: showStatus(message, status)
//
// Updates the status message box at the top.
//
// Parameters:
//   message : string to display
//   status  : "success" or "error" (determines color)
//
// The message updates with a fade-in animation.
// ============================================================

function showStatus(message, status = 'success') {
    const statusEl = document.getElementById('status');
    
    // Update text
    statusEl.textContent = message;
    
    // Remove previous status classes
    statusEl.classList.remove('success', 'error');
    
    // Add new status class if specified
    if (status === 'success') {
        statusEl.classList.add('success');
    } else if (status === 'error') {
        statusEl.classList.add('error');
    }
}