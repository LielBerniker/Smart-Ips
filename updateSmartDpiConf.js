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
const modeUpdate = "Mode update"
const stateUpdate = "State update"

var smartDpiInformationKey = "smart_dpi_information";

window.gatewayName;
window.currentGatewayInfo = new GatewayConfigInfo(0, monitorStr, 60);

function updateByConfiguration() {
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
}

function onCommitfetchLocal(value) {
  if (Array.isArray(value) && value.length > 0) {
    var firstItem = value[0];
    console.log("Finish to run fw fetch local");
    document.querySelector('button[type="submit"]').disabled = false;
  }
}

function needNewGWreport(currentTime, storedTime) {
  const timeDifference = (currentTime - storedTime) / (1000 * 60); // Convert milliseconds to minutes
  if (timeDifference > 20) {
    return true
  }
  return false
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
      updateByConfiguration()
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
  const currentTime = new Date().toISOString();
  const SmartDpiObject = {
    isEnabled: window.currentGatewayInfo.isEnabled,
    mode: window.currentGatewayInfo.mode,
    threshold: window.currentGatewayInfo.threshold,
    protections: window.currentGatewayInfo.protections,
    history: window.currentGatewayInfo.history,
    timestamp: currentTime
  };
  localStorage.setItem(smartDpiInformationKey, JSON.stringify(SmartDpiObject));
  console.log("Finish to update local storage");
  document.getElementById('critical-impact-protections').click();
  console.log("click on critical-impact-protections");
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
  updateByConfiguration()
  console.log("Finish to get data from local storage");

  document.getElementById('critical-impact-protections').click();
  console.log("click on critical-impact-protections");
  removeLoader()
}

function handleTableContent(event) {
  const tableContainer = document.querySelector('.protection-table-wrapper');

}





















function formatDate(date) {
  const year = date.getFullYear().toString().slice(-2); // last two digits of year
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // month
  const day = date.getDate().toString().padStart(2, '0'); // day
  return `20${year}-${month}-${day}`;
}


function showLoading() {
  document.getElementById('loading-div').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-div').classList.add('hidden');
}

// Function to extract the date in 'YYYY-MM-DD' format from the given date string
function convertDateFormat(dateStr) {
  const months = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const [day, month, year] = dateStr.split(' ').slice(0, 3);
  return `20${year}-${months[month]}-${day.padStart(2, '0')}`;
}

function createItemsForTimeLine() {
  const timelineMap = new Map();
  prevDate = ""
  let protectionsSet = new Set();
  window.currentGatewayInfo.history.forEach(logInfo => {
    const dateKey = convertDateFormat(logInfo.date);
    console.log("curent datekey");
    console.log(dateKey);
    console.log("prev datekey");
    console.log(prevDate);

    if (dateKey !== prevDate){
      console.log("new date");
      let dataKeySet = new Set();
      timelineMap.set(dateKey, dataKeySet);
      prevDate = dateKey;
    }

    let currentData = timelineMap.get(dateKey);

    if (logInfo.status === disabledStr){
      if (!currentData.has(logInfo.name)){
        currentData.add(logInfo.name);
        protectionsSet.add(logInfo.name)
      } 
    } else if (logInfo.status === enabledStr) {
      if (currentData.has(logInfo.name)){
        protectionsSet.delete(logInfo.name);
      } 
    }
  });

  const items = [];
  let idCounter = 1; // Initialize a counter for unique IDs

  console.log("Size of timelineMap:", timelineMap.size);

  timelineMap.forEach((protectionsSet, dateKey) => {
    // Convert the set to an array and create the info array
    console.log("curent datekey")
    console.log(dateKey)
    const infoArray = Array.from(protectionsSet);
    if (infoArray.length > 0){
        // Create the item object
        const item = {
          id: idCounter,
          content: String(infoArray.length),
          start: dateKey,
          info: infoArray,
          className: 'custom-item' 
        };

      // Add the item object to the items array
      items.push(item);
      idCounter++; // Increment the counter after pushing the item
    }
  });
  return items;
}


function createTableContent(tableType){
    const tableContainer = document.querySelector('.protection-table-wrapper');
    tableContainer.innerHTML = ''; // Clear existing table

    // Create the table and its content dynamically
    const table = document.createElement('table');
    table.className = 'protection-table';

    const colgroup = document.createElement('colgroup');
    colgroup.innerHTML = `
        <col style="width: 50%;">
        <col style="width: 25%;">
        <col style="width: 25%;">
    `;
    table.appendChild(colgroup);

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th class="protection-table-th">Name</th>
            <th class="protection-table-th">Date</th>
            <th class="protection-table-th">Status</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'protection-table-tbody';

    tableInformationList = (tableType === 'Critical Impact Protections') ? window.currentGatewayInfo.protections : window.currentGatewayInfo.history;
    tableInformationList.forEach(row => {
        const tr = document.createElement('tr');
        tdClassStatus = "protection-table-td-status-"
        if (row.status === modeUpdate || row.status === stateUpdate) {
          tdClassStatus += "Update";
        } else {
          tdClassStatus += row.status;
        }
        tr.innerHTML = `<td class="protection-table-td">${row.name}</td>
                        <td class="protection-table-td">${row.date}</td>
                        <td class="${tdClassStatus}">${row.status}</td>`;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);
}

function createTimeLine(){
  
  const protectionTableWrapper = document.querySelector('.protection-table-wrapper');
  console.log('in create timeline');
  // Add the new HTML content
  protectionTableWrapper.innerHTML = `
    <div id="visualization"></div>
    <div id="overlay"></div>
    <div id="item-modal">
        <div id="item-details"></div>
        <button onclick="closeModal()">OK</button>
    </div>
    <div id="content"></div>
    `;
  
  var items = new vis.DataSet(createItemsForTimeLine());
  var today = new Date();
  var formattedDate = formatDate(today);
  // Configuration for the Timeline
  var options = {
    width: '100%',
    height: '100px',
    editable: {
      add: false,         
      remove: false,     
      updateTime: false,   
      updateGroup: false   
    },
    margin: {
        item: 10,
        axis: 5
    },
    orientation: 'bottom',
    end: formattedDate
  };

  // Create a Timeline
  var container = document.getElementById('visualization');
  var timeline = new vis.Timeline(container, items, options);

  // Add an event listener for the click event
  timeline.on('click', function (properties) {
    if (properties.item) {
        var item = items.get(properties.item);
        var details = `
            <p><strong>Disabled Protections</strong></p>
            <ul>${item.info.map(info => `<li>${info}</li>`).join('')}</ul>
        `;
        document.getElementById('item-details').innerHTML = details;
        document.getElementById('item-modal').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
    }
  });

  // Hide the loading icon after the timeline is created
  // timeline.on('currentTimeTick', function() {
  //   hideLoading();
  // });


  // Function to close the modal
  window.closeModal = function () {
    document.getElementById('item-modal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
  }

}




















function initParameters() {
 

  updateByConfiguration()

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
  });

  document.querySelectorAll('.header-container h1').forEach(item => {

    if (item.dataset.listenerAdded) return;

    item.addEventListener('click', event => {

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
        if (item.textContent == 'Timeline'){
          createTimeLine();
        } else{
          createTableContent(item.textContent)
        }
        hideLoading();

    });
    // Mark this item as having an event listener attached
    item.dataset.listenerAdded = "true";
  });

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
      }
      removeLoader()
    }
  }
}

function RunConfigReport() {
  // send API request
  const mgmtCli = `run-script script-name "smart_dpi_config_report" script "${smartDpiConfigReport}" targets.1 "${window.gatewayName}" --format json`;
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
  initParameters()
}

/*
 * Send API request 'get-context' (get-context return JSON object of extension location context).
 */
function showContext() {
  addLoader();
  // send API request
  smxProxy.sendRequest("get-context", null, "onContext");
}
