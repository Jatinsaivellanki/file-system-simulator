# File System Simulator 💾

A web-based interactive simulation of a file system utilizing **Contiguous Allocation**, a 50-block disk visualization, and crash recovery mechanisms.

---

## 🚀 Features

* **Contiguous File Allocation:** Allocates contiguous blocks on the disk for newly created files.
* **Interactive Disk Grid:** Visualizes 50 disk blocks in real time, color-coded by block state (**Free** vs. **Used**).
* **File Management:** Create files by specifying filename and size (in blocks), or remove existing files by name.
* **File Directory:** View an active directory list of all created files along with their metadata.
* **System Crash & Recovery:** Simulate system crashes and test crash recovery routines with dedicated controls.

---

## 🛠️ Project Structure

```text
file-system-simulator/
├── backend/          # Backend engine and logic
├── frontend/         # Web user interface
│   ├── index.html    # Core layout and UI controls
│   ├── style.css     # Styling and disk grid visualizer
│   └── script.js     # Frontend logic and DOM controller
└── server/           # Server configuration / API endpoints
