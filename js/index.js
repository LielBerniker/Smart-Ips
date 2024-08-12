var smartDpiInformationKey = "smart_dpi_information";
var smartDpiGWCodeKey = "smart_dpi_gw_code";

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
      runConfigReport()
      updateInfoLocalStorge(window.currentGatewayInfo, smartDpiInformationKey)
      runLocalFetchOnGW()
    }
  }
}

function runUpdateConfigOnGW() {
  console.log(window.currentGatewayInfo);
  const updateConfigCli = SMART_DPI_PYTHON_CONFIG_UPDATE + " " + window.currentGatewayInfo.isEnabled.toString() + " " + window.currentGatewayInfo.mode + " " + window.currentGatewayInfo.threshold.toString()
  console.log(updateConfigCli);
  const mgmtCli = `run-script script-name "smart_dpi_config_update" script "${updateConfigCli}" targets.1 "${window.gatewayName}" --format json`;
  console.log(mgmtCli);

  //request to commit changes
  smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "onCommitUpdate");
}

function readInfoFromLocalStorge(parsedSmartDpiInformation) {
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
}

function handleHeaderClick(event) {

  const item = event.target; // Get the clicked element
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

  if (item.textContent === 'Timeline') {
      createTimeLine(window.currentGatewayInfo);
  } else {
      createTableContent(item.textContent, window.currentGatewayInfo);
  }
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
        updateInfoLocalStorge(window.currentGatewayInfo, smartDpiInformationKey)
      }
    }
  }
}

function runConfigReport() {
  // send API request
  const mgmtCli = `run-script script-name "smart_dpi_config_report" script "${SMART_DPI_PYTHON_CONFIG_REPORT}" targets.1 "${window.gatewayName}" --format json`;
  smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "onCommitReport");
}


function handleGWInformation() {
  console.log("handle information")
  if (!localStorage.hasOwnProperty(smartDpiInformationKey)) {
    runConfigReport()
  } else {
    const storedData = localStorage.getItem(smartDpiInformationKey);
    const parsedData = JSON.parse(storedData);
    const storedTime = new Date(parsedData.timestamp);
    if (isTimePass(storedTime, GET_NEW_REPORT_TIME)) {
      runConfigReport()
    } else {
      readInfoFromLocalStorge(parsedData)
    }
  }
}

function handleGWCodeResult(value) {
  if (Array.isArray(value) && value.length > 0) {
    var firstItem = value[0];
    if (!isTaskSucceeded(firstItem)){
      console.log('fail to get report of Smart IPS code in the GW');
      alert('fail to get report of Smart IPS code in the GW');
    } else {
      if (!isCodeOnGW(firstItem)){
        console.log('Fail to read response of gw code, or the needed GW code not availble');
        updateGWCodeLocalStorge(NOT_FOUND_GW_CODE, smartDpiGWCodeKey)
      } else {
        updateGWCodeLocalStorge(FOUND_GW_CODE, smartDpiGWCodeKey)
        handleGWInformation()
      }
    }
  }
}

function receiveGWCode() {
  // send API request
  const mgmtCli = `run-script script-name "smart_dpi_find_gw_code" script "${SMART_DPI_FIND_GW_CODE}" targets.1 "${window.gatewayName}" --format json`;
  console.log(mgmtCli)
  smxProxy.sendRequest("request-commit", {"commands" : [mgmtCli]}, "handleGWCodeResult");
}

function receiveGWName(obj) {
  window.gatewayName = obj.event.objects[0]["name"];
  smartDpiInformationKey += "_" + window.gatewayName;
  smartDpiGWCodeKey += "_" + window.gatewayName;
  console.log(smartDpiInformationKey);
  console.log(smartDpiGWCodeKey);
  if (!localStorage.hasOwnProperty(smartDpiGWCodeKey)) {
    receiveGWCode()
    console.log("smartDpiGWCodeKey not in local storge")
  } else {
    console.log("smartDpiGWCodeKey is in local storge")
    const storedData = localStorage.getItem(smartDpiGWCodeKey);
    const parsedData = JSON.parse(storedData);
    const storedTime = new Date(parsedData.timestamp);
    if (isTimePass(storedTime, GET_NEW_GW_CODE_TIME)) {
      receiveGWCode()
    } else {
      if (Number(parsedData.isCodeOnGW) === 1) {
        console.log("gw got the needed code for the extension")
        handleGWInformation()
      }
    }
  }
}

function initializeElemets() {
  document.addEventListener('DOMContentLoaded', (event) => {
    const protectionsHeader = document.getElementById('critical-impact-protections');
    protectionsHeader.removeEventListener('click', handleHeaderClick);  
    protectionsHeader.addEventListener('click', handleHeaderClick);    
  
    const logHistoryHeader = document.getElementById('log-history');
    logHistoryHeader.removeEventListener('click', handleHeaderClick);
    logHistoryHeader.addEventListener('click', handleHeaderClick);
  
    const timelineShowHeader = document.getElementById('timeline-show');
    timelineShowHeader.removeEventListener('click', handleHeaderClick);
    timelineShowHeader.addEventListener('click', handleHeaderClick);
  });
}

/*
 * Send API request 'get-context' (get-context return JSON object of extension location context).
 */
function initializeApp() {
  initializeElemets()
  // send API request
  smxProxy.sendRequest("get-context", null, "receiveGWName");
}


