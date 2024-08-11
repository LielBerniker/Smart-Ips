// 1. Class Definitions

export class ProtectionInformation {
    constructor(name, date, status) {
        this.name = name;
        this.date = date;
        this.status = status;
    }  
}

export class GatewayConfigInfo {
    constructor(isEnabled, mode, threshold) {
        this.isEnabled = isEnabled;
        this.mode = mode;
        this.threshold = threshold;
        this.protections = [];
        this.history = [];
    }  
}

// 2. Constant Definitions

// Command paths for Smart DPI configuration
export const SMART_DPI_CONFIG_UPDATE = "python3 $FWDIR/bin/smart_dpi_config_update.pyc";
export const SMART_DPI_CONFIG_REPORT = "python3 $FWDIR/bin/smart_dpi_config_report.pyc";

// Mode Constants
export const DISABLED_MODE = 1; // Send report to cloud only
export const MONITOR_MODE = 2;  // Monitor + send log to smart console
export const ACTION_MODE = 3;   // Completely enabled

// Status Strings
export const MONITOR_STR = "Monitor";
export const ACTION_STR = "Action";
export const ENABLED_STR = "Enabled";
export const DISABLED_STR = "Disabled";

// Update Descriptions
export const MODE_UPDATE = "Mode update";
export const STATE_UPDATE = "State update";
