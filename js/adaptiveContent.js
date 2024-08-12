function getNextDayFormated(date) {
  // Convert prevDate to a Date object
  let prevDateObj = new Date(date);
  // Add one day to the prevDate
  prevDateObj.setDate(prevDateObj.getDate() + 1);
  // Format the new date as 'YYYY-MM-DD'
  return prevDateObj.toISOString().split('T')[0];
}

function formatDate(date) {
  const year = date.getFullYear().toString().slice(-2); // last two digits of year
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // month
  const day = date.getDate().toString().padStart(2, '0'); // day
  return `20${year}-${month}-${day}`;
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

function createItemsForTimeLine(history) {
  const timelineMap = new Map();
  prevDate = ""
  let protectionsSet = new Set();
  for (let i = history.length - 1; i >= 0; i--) {
    const logInfo = window.currentGatewayInfo.history[i]
    const dateKey = convertDateFormat(logInfo.date);
    console.log("curent datekey");
    console.log(dateKey);
    console.log("prev datekey");
    console.log(prevDate);

    if (prevDate === ""){
      console.log("in first prev")
      timelineMap.set(dateKey, new Set());
      prevDate = dateKey;
    }
    while (dateKey !== prevDate) {
      dayAfterPrev = getNextDayFormated(prevDate)
      console.log("the next day");
      console.log(dayAfterPrev);
      timelineMap.set(dayAfterPrev, new Set(protectionsSet));
      prevDate = dayAfterPrev;
    }

    let currentData = timelineMap.get(dateKey);

    if (logInfo.status === DISABLED_STR){
      if (!currentData.has(logInfo.name)){
        currentData.add(logInfo.name);
        protectionsSet.add(logInfo.name)
      } 
    } else if (logInfo.status === ENABLED_STR) {
      if (currentData.has(logInfo.name)){
        protectionsSet.delete(logInfo.name);
      } 
    }
  }
  if (protectionsSet.size > 0){
    var currentDate = new Date();
    var formatedDate = formatDate(currentDate);
    while (formatedDate !== prevDate){
      dayAfterPrev = getNextDayFormated(prevDate)
      console.log("the next day");
      console.log(dayAfterPrev);
      timelineMap.set(dayAfterPrev, new Set(protectionsSet));
      prevDate = dayAfterPrev;
    }
  }

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


function createTableContent(tableType, currentGatewayInfo){
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

    tableInformationList = (tableType === 'Critical Impact Protections') ? currentGatewayInfo.protections : currentGatewayInfo.history;
    console.log(tableInformationList)
    tableInformationList.forEach(row => {
        const tr = document.createElement('tr');
        tdClassStatus = "protection-table-td-status-"
        if (row.status === MODE_UPDATE || row.status === STATE_UPDATE) {
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

function createTimeLine(currentGatewayInfo){
  
  const protectionTableWrapper = document.querySelector('.protection-table-wrapper');
  console.log('in create timeline');
  // Add the new HTML content
  protectionTableWrapper.innerHTML = `
    <div id="visualization"></div>
    <div id="overlay"></div>
    <div id="item-modal">
        <div id="item-details"></div>
        <button class="close-modal" onclick="closeModal()">OK</button>
    </div>
    <div id="content"></div>
    `;
  
  var items = new vis.DataSet(createItemsForTimeLine(currentGatewayInfo.history));
  var currentDate = new Date();
  // edit the current date to have the date of tomorrow
  currentDate.setDate(currentDate.getDate() + 1);
  var formattedDate = formatDate(currentDate);
  // Configuration for the Timeline
  var options = {
    width: '100%',
    height: '200px',
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
    end: formattedDate, // show tommorow as the most right in the timeline
    zoomMin: 1000 * 60 * 60 * 24 * 3, // show min zoom of days
  };

  // Create a Timeline
  var container = document.getElementById('visualization');
  var timeline = new vis.Timeline(container, items, options);

  // Add an event listener for the click event
  timeline.on('click', function (properties) {
    if (properties.item) {
        var item = items.get(properties.item);
        var details = `
            <p class="items-header"><strong>Disabled Protections</strong></p>
            <ul class="items-list">${item.info.map(info => `<li>${info}</li>`).join('')}</ul>
        `;
        document.getElementById('item-details').innerHTML = details;
        document.getElementById('item-modal').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
    }
  });

  // Function to close the modal
  window.closeModal = function () {
    document.getElementById('item-modal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
  }
}