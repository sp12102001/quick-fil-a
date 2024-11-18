# Template Inserter Chrome Extension

A Chrome extension that allows users to create, manage, and quickly insert customizable text templates using shortcuts.

## Features

- Create and manage reusable text templates with variables
- Insert templates using custom shortcuts
- Rich text editor for template creation
- Import/export templates as JSON
- Fill-in-the-blank variables with an interactive popup
- Works in any text input field or rich text editor

## Installation

1. Clone this repository or download the files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

### Creating Templates

1. Click the extension icon to open the Template Manager
2. Click "Add New Template"
3. Enter:
   - Shortcut: The text trigger (e.g. "+hello")
   - Description: A name for the template
   - Template: The template text with optional variables using {{variable_name}} syntax
4. Click "Save"

### Using Templates

1. In any text input field, type your shortcut
2. If variables exist, a popup will appear to fill them in
3. Press Enter or click "Insert" to add the completed template

### Managing Templates

- Edit: Click the "Edit" button on any template to modify it
- Delete: Click the "Delete" button to remove a template
- Import/Export: Use the buttons to backup or restore your templates

## Files

- `manifest.json` - Extension configuration and permissions
- `popup.html` - Template manager interface
- `popup.js` - Template manager functionality
- `popup.css` - Template manager styling
- `contentScript.js` - Template insertion and variable handling
- `templates.json` - Sample templates file

## Technical Details

The extension uses:
- Chrome Storage Sync API for cross-device template syncing
- Content Scripts for detecting shortcuts and inserting templates
- Rich text editing capabilities
- Bootstrap for UI components

## License

MIT License - feel free to modify and reuse this code.
