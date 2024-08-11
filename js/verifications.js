// import { MONITOR_STR, ACTION_STR, ENABLED_STR,  DISABLED_STR } from './config.js';

function updateByConfiguration(currentGatewayInfo) {
  const stateToggle = document.getElementById('stateToggle');
  const stateStatus = document.querySelector('.state-status');
  const modeOptions = document.querySelectorAll('input[name="mode"]');
  const monitorOption = document.querySelector('input[name="mode"][value="monitor"]');
  const actionOption = document.querySelector('input[name="mode"][value="action"]');
  const thresholdInput = document.getElementById('threshold');

  // Set initial state
  if (currentGatewayInfo.isEnabled === 1) {
    stateToggle.checked = true;
    stateStatus.textContent = ENABLED_STR;
  } else {
    stateToggle.checked = false;
    stateStatus.textContent = DISABLED_STR;
  }
  modeOptions.forEach(option => option.disabled = !stateToggle.checked);

  // Set initial mode
  if (currentGatewayInfo.mode === MONITOR_STR) {
      monitorOption.checked = true;
  } else if (window.currentGatewayInfo.mode === ACTION_STR) {
      actionOption.checked = true;
  }

  // Set initial threshold
  thresholdInput.value = currentGatewayInfo.threshold;

  // Ensure initial mode is set correctly
  if (currentGatewayInfo.isEnabled === 1) {
      modeOptions.forEach(option => option.disabled = false);
  } else {
      monitorOption.checked = true;
      modeOptions.forEach(option => option.disabled = true);
  }
}

function needNewGWreport(currentTime, storedTime) {
  const timeDifference = (currentTime - storedTime) / (1000 * 60); // Convert milliseconds to minutes
  if (timeDifference > 20) {
    return true
  }
  return false
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

function updateLocalStorge(currentGatewayInfo, smartDpiInformationKey) {
  console.log(smartDpiInformationKey);
  const currentTime = new Date().toISOString();
  const SmartDpiObject = {
    isEnabled: currentGatewayInfo.isEnabled,
    mode: currentGatewayInfo.mode,
    threshold: currentGatewayInfo.threshold,
    protections: currentGatewayInfo.protections,
    history: currentGatewayInfo.history,
    timestamp: currentTime
  };
  localStorage.setItem(smartDpiInformationKey, JSON.stringify(SmartDpiObject));
  console.log("Finish to update local storage");
  document.getElementById('critical-impact-protections').click();
  console.log("click on critical-impact-protections");
}










