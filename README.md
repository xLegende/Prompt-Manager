# Local AI Prompt Manager 🎨✨

A local, lightweight, and powerful tool to organize, manage, and generate prompts for AI Image Generation (Stable Diffusion, Flux, Midjourney, etc.).

**It runs entirely in your browser but saves data directly to your local hard drive.** No cloud, no servers, no data leaks.

## 🚀 Key Features

*   **🔒 100% Local:** Uses the File System Access API to read/write directly to a folder on your computer.
*   **📂 Image Metadata Extraction:** Drag & drop PNGs from **Automatic1111, ComfyUI, or CivitAI**. The app automatically extracts the Prompt, Negative Prompt, Seed, Model, and Sampler settings.
*   **🏷️ Smart Tag Editor:**
    *   Drag-and-drop tag reordering.
    *   Color-coded tags (LoRA, Embeddings, Wildcards, BREAK).
    *   Autocomplete suggestions based on your history and loaded dictionaries.
*   **📦 Bulk Operations:** Import hundreds of images at once or batch-add/remove tags from multiple cards.
*   **🔀 Dynamic Prompting:**
    *   **Wildcards:** Use `__filename__` to insert random lines from `.txt` files.
    *   **Placeholders:** Define variables like `{artist}` or `{quality}` and swap them globally.
*   **🔎 Advanced Search & Filter:** Filter by specific tags, favorites, LoRAs, or metadata.
*   **⚙️ Image Optimization:** Automatically convert, resize, or strip metadata from referenced images to save space.

---

## 🛠️ Installation & Usage

Since this is a client-side application, there is no complex installation. However, because it uses the **File System Access API**, it works best on Chromium-based browsers (Chrome, Edge, ...).

### Method 1: Direct Open
You can try opening `index.html` directly in Chrome, but security restrictions might prevent the File System API from saving files reliably. **Using a local server (Method 2) is recommended.**


### Method 2: Python Simple Server
If you have Python installed:
1.  Open a terminal in the project folder.
2.  Run: `python -m http.server`
3.  Open `http://localhost:8000` in your browser.

---

## 📂 How It Works (Data Structure)

When you click **Connect Folder**, the app creates the following structure in your selected directory. You can back up this folder or sync it via Dropbox/Google Drive to share across computers.

```text
Prompt-Manager/
├── prompts.json         # Database of your prompts and metadata
├── placeholders.json    # Your defined placeholder variables
├── dictionary.csv       # (Optional) Imported tag dictionary for autocomplete
├── img/                 # Folder where referenced images are stored
└── wildcards/           # Folder for .txt files (e.g., colors.txt, hair.txt)
```

---

## 📖 User Guide

### 1. The Library
The main view shows all your saved prompts.
*   **Copying:** Click a prompt tag to copy just that tag. Click the Copy icon on the card to copy the full prompt (with Wildcards/Placeholders processed!).
*   **Selecting:** Click the circle in the top-left of a card to enter Batch Mode.

### 2. Importing Images
*   **Single Import:** Drag an image into the "Editor" drop zone. It will parse the metadata and let you edit before saving.
*   **Bulk Import:** Click "Import Images" in the sidebar. Select multiple PNGs. The app will auto-import them to the library and save copies to the `img/` folder.

### 3. Dynamic Prompts
*   **Wildcards:** Create a file named `colors.txt` in the Wildcards tab. Add `Red`, `Blue`, `Green` on separate lines. In your prompt, type `__colors__`. When you copy the prompt, the app picks a random color.
*   **Placeholders:** Go to the Placeholders tab. Add `Key: quality`, `Value: (masterpiece, best quality:1.2)`. In your prompt, type `{quality}`.

### 4. Settings
*   **Dictionary:** Load a CSV (like a Danbooru tag list) to get instant autocomplete for thousands of tags.
*   **Image Optimization:** Configure the app to automatically convert uploaded PNGs to WEBP or JPEG to save disk space.

---

## ⌨️ Shortcuts

| Key | Action |
| :--- | :--- |
| `Enter` / `,` | Add tag in Editor |
| `Backspace` | Remove last tag (if input empty) |
| `Tab` | Autocomplete tag |
| `Drag` | Reorder tags in the input box |

---

## 🛡️ Privacy & Security

*   **Local Only:** This app does not have a backend. It does not phone home.
*   **Your Data:** All data lives in the folder you select on your computer.
*   **Safety:** The app creates a sandbox within the selected folder. It cannot access other parts of your hard drive.

---

## 📄 License

Distributed under the Apache License 2.0. See `LICENSE` for more information.