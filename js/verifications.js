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

function isTimePass(storedTime, timeInMinutes) {
  const currentTime = new Date();
  const timeDifference = (currentTime - storedTime) / (1000 * 60); // Convert milliseconds to minutes
  if (timeDifference > timeInMinutes) {
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

function updateInfoLocalStorge(currentGatewayInfo, smartDpiInformationKey) {
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
  console.log("Finish to update info local storage");
  document.getElementById('critical-impact-protections').click();
  console.log("click on critical-impact-protections");
}

function updateGWCodeLocalStorge(gwCodeState, smartDpiGWCodeKey) {
  console.log(smartDpiGWCodeKey);
  const currentTime = new Date().toISOString();
  const SmartDpiGWCodeObject = {
    isCodeOnGW: gwCodeState,
    timestamp: currentTime
  };
  localStorage.setItem(smartDpiGWCodeKey, JSON.stringify(SmartDpiGWCodeObject));
  console.log("Finish to update gw code local storage");
}


function isCodeOnGW(item) {
  try {
    const jsonString = item.substring(item.indexOf('{'), item.lastIndexOf('}') + 1);
    const jsonData = JSON.parse(jsonString);
    if (jsonData.tasks && jsonData.tasks.length > 0) {
      responseMessage = jsonData.tasks[0]["task-details"][0].responseMessage;
      const decodedMessage = atob(responseMessage);
      console.log(decodedMessage);
      if (Number(decodedMessage) === FOUND_GW_CODE) {
        return true;
      }
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