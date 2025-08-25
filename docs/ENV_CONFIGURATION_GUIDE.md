# Environment Configuration Guide (Legacy Server Content Removed)

## 📁 Files Overview

### `.env` 
Main configuration file containing all server settings. Located in the root directory.

### `scripts/load_env.bat`
Utility script that loads environment variables from the `.env` file into batch scripts.

### `scripts/env_manager.bat`
Interactive configuration manager for easily editing and managing environment settings.

## 🚀 Quick Start

1. **First Time Setup**
   ```bash
   # The .env file is automatically created with defaults
   # Run the main server manager:
   scripts\coc_server_manager.bat
   ```

2. **Edit Configuration**
   ```bash
   # Option 1: Use the built-in manager
   scripts\coc_server_manager.bat
   # Then select: E. Environment Configuration Manager
   
   # Option 2: Direct editing
   scripts\env_manager.bat
   
   # Option 3: Manual editing
   notepad .env
   ```

## ⚙️ Key Configuration Sections

### Server Identity
```ini
SERVER_NAME=
SERVER_DESCRIPTION=
SERVER_PASSWORD=
```

### Connection Settings
```ini
DEFAULT_SERVER_ID=
SERVER_TOKEN=
CONNECTION_DEDICATED_PORT=
QUERY_DEDICATED_PORT=
```

## 🛠️ Environment Manager Features

### Main Functions

- **View Current Configuration** - See all loaded settings
- **Edit Configuration** - Open in Notepad or VS Code
- **Backup/Restore** - Automatic timestamped backups
- **Validate Configuration** - Check for errors and missing settings
- **Quick Settings Wizard** - Guided configuration for key settings
- **Reset to Defaults** - Restore original configuration

### Advanced Features

- **Export/Import** - Share configurations between setups
- **Configuration Validation** - Ensure all required settings are present
- **Path Verification** - Check if configured directories exist
- **Automatic Backups** - Before any major changes

## 🔧 How It Works

1. **Loading Process**
   - Scripts check for `.env` file in root directory
   - `load_env.bat` parses the file and sets environment variables
   - If no `.env` file exists, fallback defaults are used

2. **Variable Usage**
   - All scripts use environment variables instead of hardcoded values
   - Changes to `.env` file take effect on next script run
   - Environment manager can reload settings without restart

3. **Backup System**
   - Automatic backups before configuration changes
   - Timestamped backup files in `env_backups/` directory
   - Easy restoration from any previous backup

## 📝 Customization Examples

All previous server/directory/mod examples removed for simplicity.

## 🚨 Important Notes

### Required Settings

No dedicated server credentials are required now. Focus on Clash of Clans API credentials only.

### Path Configuration

Not applicable (no local server process managed).

### Backup Strategy

- Environment manager automatically backs up before changes
- Manual backups recommended before major modifications
- Keep backups of working configurations

## 🎯 Integration with Scripts

### Main Server Manager

- Loads `.env` on startup
- Shows current configuration in header
- Option E opens environment manager
- Automatically reloads config after changes

### Mod Collection Utility

Removed.

### All Scripts

- Consistent configuration across all tools
- Single source of truth for settings
- Easy maintenance and updates

## 🔍 Troubleshooting

### Configuration Not Loading

1. Check if `.env` file exists in root directory
2. Verify file format (key=value pairs)
3. Check for special characters in values
4. Use environment manager validation feature

### Settings Not Taking Effect

1. Restart the script after changes
2. Check for syntax errors in `.env` file
3. Verify variable names match exactly
4. Use environment manager to validate configuration

### Path Issues

1. Use absolute paths (not relative)
2. Ensure directories exist
3. Check for typos in path names
4. Use environment manager path verification

Legacy server configuration removed. Only API/environment variables for the web dashboard remain.
