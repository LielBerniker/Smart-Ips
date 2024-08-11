// 1. Class Definitions

class ProtectionInformation {
    constructor(name, date, status) {
        this.name = name;
        this.date = date;
        this.status = status;
    }  
}

class GatewayConfigInfo {
    constructor(isEnabled, mode, threshold) {
        this.isEnabled = isEnabled;
        this.mode = mode;
        this.threshold = threshold;
        this.protections = [];
        this.history = [];
    }  
}

// 2. Constant Definitions

// scripts file path
const SMART_DPI_CONFIG_UPDATE = "$FWDIR/bin/smart_dpi_config_update.pyc";
const SMART_DPI_CONFIG_REPORT = "$FWDIR/bin/smart_dpi_config_report.pyc";

// Command paths for Smart DPI configuration
const SMART_DPI_PYTHON_CONFIG_UPDATE = "python3 " + SMART_DPI_CONFIG_UPDATE;
const SMART_DPI_PYTHON_CONFIG_REPORT = "python3 " + SMART_DPI_CONFIG_REPORT;

const SMART_DPI_FIND_GW_CODE = 'if [ -f ' +  SMART_DPI_CONFIG_UPDATE + '] && [ -f ' + SMART_DPI_CONFIG_REPORT + ' ]; 1; 0; fi';

// Mode Constants
const DISABLED_MODE = 1; // Send report to cloud only
const MONITOR_MODE = 2;  // Monitor + send log to smart console
const ACTION_MODE = 3;   // Completely enabled

// Status Strings
const MONITOR_STR = "Monitor";
const ACTION_STR = "Action";
const ENABLED_STR = "Enabled";
const DISABLED_STR = "Disabled";

// Update Descriptions
const MODE_UPDATE = "Mode update";
const STATE_UPDATE = "State update";
