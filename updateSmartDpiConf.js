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

const smartDpiConfigUpdate = "python3 $FWDIR/bin/smart_dpi_config_update.pyc";
const smartDpiConfigReport = "python3 $FWDIR/bin/smart_dpi_config_report.pyc";
const disabledMode = 1 /* Send report to cloud only */
const monitordMode = 2 /* Monitor + send log to smart console */
const actionMode = 3 /* Completely enabled */
const monitorStr = "Monitor"
const actionStr = "Action"
const enabledStr = "Enabled"
const disabledStr = "Disabled"

var smartDpiInformationKey = "smart_dpi_information";

window.gatewayName;
window.currentGatewayInfo = new GatewayConfigInfo(0, monitorStr, 60);

function onCommitfetchLocal(value) {
  if (Array.isArray(value) && value.length > 0) {
    var firstItem = value[0];
    console.log("Finish to run fw fetch local");
  }
}

function runLocalFetchOnGW() {

  const fetchLocalCli = "fw fetch local"
  const mgmtCli = `run-script script-name "fw_fetch_local" script "${fetchLocalCli}" targets.1 "${window.gatewayName}" --format json`;
  //request to commit changes
  smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "onCommitfetchLocal");
}

function isTaskSucceeded(item) {
  try {
    // temp1
    console.log(JSON.stringify(item, null, 2));
    const jsonString = item.substring(item.indexOf('{'), item.lastIndexOf('}') + 1);
    console.log(jsonString);
    const jsonData = JSON.parse(jsonString);
    console.log(jsonData);
    // Access the status of the first task directly
    if (jsonData.tasks && jsonData.tasks.length > 0) {
      console.log(jsonData.tasks);
      const taskStatus = jsonData.tasks[0].status;
      if (taskStatus === "succeeded") {
        return true;
      } else {
        alert('Item task status is faliure.');
        console.log('Item task status is faliure.');
      }
    } else {
      alert('No tasks found in data.');
      console.log('No tasks found in data.');
    }
  } catch (error) {
    const errorMessage = error.message
    alert("Error parsing JSON (isTaskSucceeded):" + errorMessage);
    console.log("Error parsing JSON (isTaskSucceeded):" + errorMessage);
  }
  return false;
}

function updateProtections(protectionsArray) {
  for (protectionConf of protectionsArray) {
    console.log(protectionConf.protection_name)
    console.log(protectionConf.status)
    protectionInfo = new ProtectionInformation(protectionConf.protection_name, protectionConf.date, protectionConf.status);
    window.currentGatewayInfo.protections.push(protectionInfo);
  }
}

function updateHistory(historyArray) {
  for (historyLog of historyArray) {
    console.log(historyLog.protection_name)
    console.log(historyLog.status)
    protectionInfo = new ProtectionInformation(historyLog.protection_name, historyLog.date, historyLog.status);
    window.currentGatewayInfo.history.push(protectionInfo);
  }
}

function getConfigurationData(item) {
  try {
    const jsonString = item.substring(item.indexOf('{'), item.lastIndexOf('}') + 1);
    const jsonData = JSON.parse(jsonString);
    if (jsonData.tasks && jsonData.tasks.length > 0) {
      responseMessage = jsonData.tasks[0]["task-details"][0].responseMessage;
      const decodedMessage = atob(responseMessage);
      const parsedResponse = JSON.parse(decodedMessage);
      let currentMode = ""
      console.log(parsedResponse)
      currentMode = Number(parsedResponse.mode);
      switch(currentMode) {
        case actionMode:
          window.currentGatewayInfo.mode = actionStr
          window.currentGatewayInfo.isEnabled = 1
          break;
        case monitordMode:
          window.currentGatewayInfo.mode = monitorStr
          window.currentGatewayInfo.isEnabled = 1
          break;

        default:
          window.currentGatewayInfo.mode = monitorStr
          window.currentGatewayInfo.isEnabled = 0
      }
      window.currentGatewayInfo.threshold = Number(parsedResponse.threshold);
      
      updateProtections(parsedResponse.protections.reverse())
      updateHistory(parsedResponse.history.reverse())
      console.log('successfully got gateway configuration information'); 
      return true;
    } else {
      alert('No tasks found in data.');
      console.log('No tasks found in data.');
    }
  } catch (error) {
    alert("Error parsing JSON(getCongigurationData):" + error);
    console.log("Error parsing JSON(getCongigurationData):" + error);
  }
  return false;
}

function onCommitUpdate(value) {
  console.log(JSON.stringify(value, null, 2));
  
  if (Array.isArray(value) && value.length > 0) {
    var firstItem = value[0];
    console.log(JSON.stringify(firstItem, null, 2));
    if (!isTaskSucceeded(firstItem)){
      alert('fail to update Smart Dpi configuration');
      console.log('fail to update Smart Dpi configuration');
    }
    else{
      updateLocalStorge()
      runLocalFetchOnGW()
    }
  }
}

function runUpdateConfigOnGW() {
  console.log(window.currentGatewayInfo);
  const updateConfigCli = smartDpiConfigUpdate + " " + window.currentGatewayInfo.isEnabled.toString() + " " + window.currentGatewayInfo.mode + " " + window.currentGatewayInfo.threshold.toString()
  console.log(updateConfigCli);
  const mgmtCli = `run-script script-name "smart_dpi_config_update" script "${updateConfigCli}" targets.1 "${window.gatewayName}" --format json`;
  console.log(mgmtCli);


  //request to commit changes
  smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "onCommitUpdate");
}

function updateLocalStorge() {
  console.log(smartDpiInformationKey);
  const SmartDpiObject = {
    enabled: window.currentGatewayInfo.isEnabled,
    state: window.currentGatewayInfo.mode,
    threshold: window.currentGatewayInfo.threshold
  };
  localStorage.setItem(smartDpiInformationKey, JSON.stringify(SmartDpiObject));
  console.log("Finish to update local storage");
}

function initParameters() {
  removeLoader()

  const stateToggle = document.getElementById('stateToggle');
  const stateStatus = document.querySelector('.state-status');
  const modeOptions = document.querySelectorAll('input[name="mode"]');
  const monitorOption = document.querySelector('input[name="mode"][value="monitor"]');
  const actionOption = document.querySelector('input[name="mode"][value="action"]');
  const thresholdInput = document.getElementById('threshold');

  // Set initial state
  if (window.currentGatewayInfo.isEnabled === 1) {
    stateToggle.checked = true;
    stateStatus.textContent = enabledStr;
  } else {
    stateToggle.checked = false;
    stateStatus.textContent = disabledStr;
  }
  modeOptions.forEach(option => option.disabled = !stateToggle.checked);

  // Set initial mode
  if (window.currentGatewayInfo.mode === monitorStr) {
      monitorOption.checked = true;
  } else if (window.currentGatewayInfo.mode === actionStr) {
      actionOption.checked = true;
  }

  // Set initial threshold
  thresholdInput.value = window.currentGatewayInfo.threshold;

  // Ensure initial mode is set correctly
  if (window.currentGatewayInfo.isEnabled === 1) {
      modeOptions.forEach(option => option.disabled = false);
  } else {
      monitorOption.checked = true;
      modeOptions.forEach(option => option.disabled = true);
  }


document.getElementById('stateToggle').addEventListener('change', function() {
    const stateStatus = document.querySelector('.state-status');
    const modeOptions = document.querySelectorAll('input[name="mode"]');
    const monitorOption = document.querySelector('input[name="mode"][value="monitor"]');
    
    if (this.checked) {
        stateStatus.textContent = 'Enabled';
        modeOptions.forEach(option => option.disabled = false);
        monitorOption.checked = true;
    } else {
        stateStatus.textContent = 'Disabled';
        modeOptions.forEach(option => option.disabled = true);
        monitorOption.checked = true;
    }
});

document.querySelector('button[type="submit"]').addEventListener('click', function(event) {
  event.preventDefault(); // Prevent form submission
  const thresholdInput = document.getElementById('threshold');
  const thresholdValue = parseInt(thresholdInput.value, 10);

  if (thresholdValue < 1 || thresholdValue > 100) {
      alert('Please insert a valid threshold percentage, between 1 to 100.');
      return;
  }

  const stateEnabled = document.getElementById('stateToggle').checked;
  const selectedMode = document.querySelector('input[name="mode"]:checked').value;
  const threshold = thresholdInput.value;

  window.currentGatewayInfo.isEnabled = stateEnabled ? 1 : 0;
  window.currentGatewayInfo.mode = selectedMode;
  window.currentGatewayInfo.threshold = threshold;
  runUpdateConfigOnGW();
});

document.querySelectorAll('.header-container h1').forEach(item => {
  item.addEventListener('click', event => {
      // Remove the active class from all h1 elements
      document.querySelectorAll('.header-container h1').forEach(h1 => {
          h1.classList.remove('active');
      });

      // Add the active class to the clicked h1 element
      item.classList.add('active');

      tableInformationList = (item.textContent === 'Critical Impact Protections') ? window.currentGatewayInfo.protections : window.currentGatewayInfo.history;
      const tbody = document.querySelector('.protection-table-tbody');
      tbody.innerHTML = ''; // Clear existing rows
      tableInformationList.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td class="protection-table-td">${row.name}</td>
                          <td class="protection-table-td">${row.date}</td>
                          <td class="protection-table-td">${row.status}</td>`;
          tbody.appendChild(tr);
      });
  });
});

// Set the default active header
document.getElementById('critical-impact-protections').classList.add('active');

}


/*
 * add loader text
 */
function addLoader() {
  var loader = document.createElement("div");
  var text = document.createElement("p");
  text.setAttribute("id", "loader-text");
  text.innerText = "Loading...";
  document.body.appendChild(text);
}

/*
 * Remove loader text
 */
function removeLoader() {
  var text = document.getElementById("loader-text");
  document.body.removeChild(text);
}


function onCommitReport(value) {
  if (Array.isArray(value) && value.length > 0) {
    var firstItem = value[0];
    if (!isTaskSucceeded(firstItem)){
      alert('fail to get report of Smart Dpi configuration');
    }
    else{
      if (!getConfigurationData(firstItem)){
        alert('fail to get Congiguration Data of Smart Dpi');
      }
      else{
        updateLocalStorge()
        initParameters()
      }
    }
  }
}

function onContext(obj) {

  window.gatewayName = obj.event.objects[0]["name"];
  smartDpiInformationKey += "_" + window.gatewayName;
  console.log(smartDpiInformationKey);
  const mgmtCli = `run-script script-name "smart_dpi_config_report" script "${smartDpiConfigReport}" targets.1 "${window.gatewayName}" --format json`;
  smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "onCommitReport");
  // if (!localStorage.hasOwnProperty(smartDpiInformationKey))
  // {
  //   // send API request
  //   const mgmtCli = `run-script script-name "smart_dpi_config_report" script "${smartDpiConfigReport}" targets.1 "${window.gatewayName}" --format json`;
  //   smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "onCommitReport");
  // }else{
  //   smartDpiInformation = localStorage.getItem(smartDpiInformationKey);
  //   const parsedSmartDpiInformation = JSON.parse(smartDpiInformation);
  //   window.currentGatewayInfo.isEnabled = Number(parsedSmartDpiInformation.enabled);
  //   window.currentGatewayInfo.mode = parsedSmartDpiInformation.state;
  //   window.currentGatewayInfo.threshold = Number(parsedSmartDpiInformation.threshold);
  //   initParameters();
  // }
  // }
}


/*
 * Send API request 'get-context' (get-context return JSON object of extension location context).
 */
function showContext() {
  addLoader();
  // send API request
  smxProxy.sendRequest("get-context", null, "onContext");
}
