import { updateByConfiguration, needNewGWreport, isTaskSucceeded, updateLocalStorge } from './verifications.js';
import { createTableContent, createTimeLine } from './adaptiveContent.js';
import { MONITOR_MODE, ACTION_MODE, MONITOR_STR, ACTION_STR, ENABLED_STR,  DISABLED_STR, ProtectionInformation, GatewayConfigInfo } from './config.js';

var smartDpiInformationKey = "smart_dpi_information";

window.gatewayName;
window.currentGatewayInfo = new GatewayConfigInfo(0, MONITOR_STR, 60);

function onCommitfetchLocal(value) {
  if (Array.isArray(value) && value.length > 0) {
    console.log("Finish to run fw amw fetch local");
  }
}

function runLocalFetchOnGW() {

  const fetchLocalCli = "fw amw fetch local"
  const mgmtCli = `run-script script-name "fw_amw_fetch_local" script "${fetchLocalCli}" targets.1 "${window.gatewayName}" --format json`;
  //request to commit changes
  smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "onCommitfetchLocal");
}


function updateProtections(protectionsArray) {
  window.currentGatewayInfo.protections.splice(0)
  for (protectionConf of protectionsArray) {
    console.log(protectionConf.protection_name)
    console.log(protectionConf.status)
    protectionInfo = new ProtectionInformation(protectionConf.protection_name, protectionConf.date, protectionConf.status);
    window.currentGatewayInfo.protections.push(protectionInfo);
  }
}

function updateHistory(historyArray) {
  window.currentGatewayInfo.history.splice(0)
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
        case ACTION_MODE:
          window.currentGatewayInfo.mode = ACTION_STR
          window.currentGatewayInfo.isEnabled = 1
          break;
        case MONITOR_MODE:
          window.currentGatewayInfo.mode = MONITOR_STR
          window.currentGatewayInfo.isEnabled = 1
          break;

        default:
          window.currentGatewayInfo.mode = MONITOR_STR
          window.currentGatewayInfo.isEnabled = 0
      }
      window.currentGatewayInfo.threshold = Number(parsedResponse.threshold);
      updateByConfiguration(window.currentGatewayInfo)
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
      RunConfigReport()
      updateLocalStorge(window.currentGatewayInfo, smartDpiInformationKey)
      runLocalFetchOnGW()
    }
  }
}

function runUpdateConfigOnGW() {
  console.log(window.currentGatewayInfo);
  const updateConfigCli = SMART_DPI_CONFIG_UPDATE + " " + window.currentGatewayInfo.isEnabled.toString() + " " + window.currentGatewayInfo.mode + " " + window.currentGatewayInfo.threshold.toString()
  console.log(updateConfigCli);
  const mgmtCli = `run-script script-name "smart_dpi_config_update" script "${updateConfigCli}" targets.1 "${window.gatewayName}" --format json`;
  console.log(mgmtCli);

  //request to commit changes
  smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "onCommitUpdate");
}

function readFromLocalStorge(parsedSmartDpiInformation) {
  console.log(parsedSmartDpiInformation.isEnabled);
  console.log(parsedSmartDpiInformation.mode);
  console.log(parsedSmartDpiInformation.threshold);
  window.currentGatewayInfo.isEnabled = Number(parsedSmartDpiInformation.isEnabled);
  window.currentGatewayInfo.mode = parsedSmartDpiInformation.mode;
  window.currentGatewayInfo.threshold = Number(parsedSmartDpiInformation.threshold);

  // Reconstruct protections array
  parsedSmartDpiInformation.protections.forEach(protection => {
    const protectionInfo = new ProtectionInformation(protection.name, protection.date, protection.status);
    window.currentGatewayInfo.protections.push(protectionInfo);
  });

  // Reconstruct history array
  parsedSmartDpiInformation.history.forEach(historyItem => {
    const historyInfo = new ProtectionInformation(historyItem.name, historyItem.date, historyItem.status);
    window.currentGatewayInfo.history.push(historyInfo);
  });
  updateByConfiguration(window.currentGatewayInfo)
  console.log("Finish to get data from local storage");

  document.getElementById('critical-impact-protections').click();
  console.log("click on critical-impact-protections");
}



function handleStateToggleChange() {
  const stateStatus = document.querySelector('.state-status');
  const modeOptions = document.querySelectorAll('input[name="mode"]');
  const monitorOption = document.querySelector('input[name="mode"][value="monitor"]');
  const thresholdInput = document.getElementById('threshold');
  
  if (document.getElementById('stateToggle').checked) {
      stateStatus.textContent = ENABLED_STR;
      modeOptions.forEach(option => option.disabled = false);
      monitorOption.checked = true;
      thresholdInput.disabled = false; // Enable threshold input
  } else {
      stateStatus.textContent = DISABLED_STR;
      modeOptions.forEach(option => option.disabled = true);
      monitorOption.checked = true;
      thresholdInput.disabled = true; // Disable threshold input
  }
}


function handleSubmitClick(event) {
  event.preventDefault(); // Prevent form submission
  event.target.disabled = true; 
  const thresholdInput = document.getElementById('threshold');
  const thresholdValue = parseInt(thresholdInput.value, 10);

  if (thresholdValue < 1 || thresholdValue > 100) {
      alert('Please insert a valid threshold percentage, between 1 to 100.');
      return;
  }
  addLoader();
  const stateEnabled = document.getElementById('stateToggle').checked;
  const selectedMode = document.querySelector('input[name="mode"]:checked').value;
  const threshold = thresholdInput.value;

  window.currentGatewayInfo.isEnabled = stateEnabled ? 1 : 0;
  window.currentGatewayInfo.mode = selectedMode;
  window.currentGatewayInfo.threshold = threshold;
  runUpdateConfigOnGW();
}



function handleHeaderClick(item) {
    if (item.classList.contains('active')) {
        return; // Do nothing if it's already active
    }

    // Remove the active class from all h1 elements 
    document.querySelectorAll('.header-container h1').forEach(h1 => {
        h1.classList.remove('active');
    });

    console.log(item.textContent);

    // Add the active class to the clicked h1 element
    item.classList.add('active');

    showLoading();

    if (item.textContent === 'Timeline') {
        createTimeLine(window.currentGatewayInfo);
    } else {
        createTableContent(item.textContent, window.currentGatewayInfo);
    }

    hideLoading();
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
        document.getElementById('critical-impact-protections').click();
        updateLocalStorge(window.currentGatewayInfo, smartDpiInformationKey)
      }
    }
  }
}

function RunConfigReport() {
  // send API request
  const mgmtCli = `run-script script-name "smart_dpi_config_report" script "${SMART_DPI_CONFIG_REPORT}" targets.1 "${window.gatewayName}" --format json`;
  smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "onCommitReport");
}

function onContext(obj) {

  window.gatewayName = obj.event.objects[0]["name"];
  smartDpiInformationKey += "_" + window.gatewayName;
  console.log(smartDpiInformationKey);
  if (!localStorage.hasOwnProperty(smartDpiInformationKey))
  {
    RunConfigReport()
  }else{
    const currentTime = new Date();
    const storedData = localStorage.getItem(smartDpiInformationKey);
    const parsedData = JSON.parse(storedData);
    const storedTime = new Date(parsedData.timestamp);
    if (needNewGWreport(currentTime, storedTime)) {
      RunConfigReport()
    } else {
      readFromLocalStorge(parsedData)
    }
  }
}

/*
 * Send API request 'get-context' (get-context return JSON object of extension location context).
 */
export function initializeApp() {
  // send API request
  smxProxy.sendRequest("get-context", null, "onContext");
}
