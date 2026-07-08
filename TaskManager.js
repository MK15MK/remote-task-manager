const express = require('express');
const si = require('systeminformation');
const { execFile } = require('child_process');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;

// When DEMO_MODE is enabled, the process list is simulated and "Stop" is a
// no-op — safe to expose on a public live demo without letting visitors
// actually kill processes on the host machine.
const DEMO_MODE = process.env.DEMO_MODE === 'true';

const VALID_PROCESS_NAME = /^[A-Za-z0-9_\-. ]+$/;

const DEMO_PROCESSES = [
  { name: 'chrome', mem: 452000, started: new Date(Date.now() - 3600_000).toISOString() },
  { name: 'explorer', mem: 118000, started: new Date(Date.now() - 7200_000).toISOString() },
  { name: 'node', mem: 84000, started: new Date(Date.now() - 1800_000).toISOString() },
  { name: 'code', mem: 305000, started: new Date(Date.now() - 5400_000).toISOString() },
  { name: 'spotify', mem: 198000, started: new Date(Date.now() - 9000_000).toISOString() },
  { name: 'discord', mem: 151000, started: new Date(Date.now() - 4500_000).toISOString() },
];

app.use(bodyParser.json());
app.use(express.static('public'));

async function getProcessList() {
  if (DEMO_MODE) {
    return DEMO_PROCESSES;
  }
  const processes = await si.processes();
  return processes.list;
}

app.get('/task-manager', async (req, res) => {
  try {
    const processList = await getProcessList();
    const applications = processList.filter((task) => task.name !== 'Extension');

    const memoryUsage = {};

    applications.forEach((application) => {
      const executable = application.name.split('.exe')[0].trim();
      if (!memoryUsage.hasOwnProperty(executable)) {
        memoryUsage[executable] = {
          totalMemory: 0,
          processes: []
        };
      }
      memoryUsage[executable].totalMemory += application.mem;
      memoryUsage[executable].processes.push(application);
    });

    const sortedExecutables = Object.keys(memoryUsage).sort((a, b) => memoryUsage[b].totalMemory - memoryUsage[a].totalMemory);

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Remote Task Manager</title>
      <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
      <style>
      h1 {
        color: white;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      body {
        background-image: linear-gradient(to right, #4358d0, #c950c2);
      }
      .demo-banner {
        background-color: #fff3cd;
        color: #664d03;
        padding: 10px 16px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-weight: bold;
        text-align: center;
      }
      table {
        background-image: linear-gradient(to bottom left, #4358d0, #c950c2);
        border-radius: 10px;
        overflow: hidden;
        text-color: #939393;
      }
      th {
        background-color: #362f4b;
        color: white;
      }
      th,
      td {
        color: #cbc5d5;
        border-bottom: inherit;
      }
      tr:nth-child(even) td {
        background-color: #ffffff;
        color:#939393;
        border-color:#ffffff;
      }
      tr:nth-child(odd) td {
        background-color: #f6f6f6;
        color:#939393;
        border-color:#f6f6f6;
      }
      .executable-column {
        width: 50%;
        text-align: left;
        color: white;
      }
      .total-memory-column {
        position: relative;
        padding: 0;
      }
      .total-memory-bar {
        height: 20px;
        position: absolute;
        top: 0;
        left: 0;
      }
      .total-memory-label {
        visibility: hidden;
      }
      .custom-dropdown {
        background-color: #191919;
        color: white;
      }
      .clock {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: white;
      }
      .custom-dropdown {
        background-color: black;
        color: white;
      }
      .low-memory {
        background-color: #00cc00;
      }
      .medium-memory {
        background-color: #ffcc00;
      }
      .high-memory {
        background-color: #ff0000;
      }
      .end-task-button {
        background-color: #ff0000;
        color: white;
        border-radius: 4px;
        border-color: #ff0000;
      }
      .search-input {
        align: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
    </style>


    </head>
    <body>
      <div class="container">
        <h1 class="text-center mt-4 mb-4">Remote Task Manager</h1>
        ${DEMO_MODE ? '<div class="demo-banner">Demo mode: this process list is simulated and Stop buttons do not affect any real machine.</div>' : ''}
        <table class="table table-dark table-striped">
          <thead>
            <tr>
              <th>Processes</th>
              <th>Start Time</th>
              <th>Total Memory</th>
            </tr>
          </thead>
          <tbody>`;

    sortedExecutables.forEach((executable) => {
      const totalMemory = memoryUsage[executable].totalMemory;
      const processes = memoryUsage[executable].processes;

      const totalMemoryPercentage = (totalMemory / (applications.reduce((total, app) => total + app.mem, 0))) * 100;
      const barWidth = Math.round(totalMemoryPercentage);

      let colorClass = 'low-memory';
      if (totalMemoryPercentage > 95) {
        colorClass = 'high-memory';
      } else if (totalMemoryPercentage > 50) {
        colorClass = 'medium-memory';
      }

      html += `
        <tr>
          <td class="executable-column">
          <button class="end-task-button" onclick="stopProcesses('${executable}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-shield-x" viewBox="0 0 16 16">
  <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
  <path d="M6.146 5.146a.5.5 0 0 1 .708 0L8 6.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 7l1.147 1.146a.5.5 0 0 1-.708.708L8 7.707 6.854 8.854a.5.5 0 1 1-.708-.708L7.293 7 6.146 5.854a.5.5 0 0 1 0-.708z"/>
</svg>
          </button>
          ${executable}
        </td>
          <td class="clock">${new Date(processes[0].started).toLocaleTimeString()}</td>
          <td class="total-memory-column">
            <div class="progress">
              <div class="progress-bar ${colorClass}" role="progressbar" style="width: ${barWidth}%;"
                aria-valuenow="${totalMemoryPercentage}" aria-valuemin="0" aria-valuemax="100"
                data-toggle="tooltip" data-placement="top" title="${totalMemoryPercentage.toFixed(2)}%">
              </div>
            </div>
          </td>
        </tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>

      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
      <script>
        $(document).ready(function() {
          $('[data-toggle="tooltip"]').tooltip();
        });

        function stopProcesses(executable) {
          const processNames = [executable];
          fetch('/stop-processes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ processNames: processNames })
          })
            .then(response => response.text())
            .then(message => {
              alert('Successfully terminated ' + message);
              location.reload();
            })
            .catch(error => console.error('Error stopping processes:', error));
        }

        function updateTable() {
          fetch('/task-manager')
            .then(response => response.text())
            .then(html => {
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              const tableBody = doc.querySelector('tbody');
              const currentTableBody = document.querySelector('tbody');
              currentTableBody.innerHTML = tableBody.innerHTML;
            })
            .catch(error => console.error('Error updating table:', error));
        }

        setInterval(updateTable, 1000);
      </script>
    </body>
    </html>`;

    res.send(html);
  } catch (error) {
    console.error('Error fetching task manager data:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/stop-processes', (req, res) => {
  const { processNames } = req.body;
  if (!processNames || !Array.isArray(processNames) || processNames.length === 0) {
    res.status(400).send('Process names are required.');
    return;
  }

  const invalidNames = processNames.filter(
    (name) => typeof name !== 'string' || !VALID_PROCESS_NAME.test(name)
  );
  if (invalidNames.length > 0) {
    res.status(400).send('Invalid process name(s).');
    return;
  }

  const terminateProcesses = (names, callback) => {
    if (names.length === 0) {
      callback();
      return;
    }

    const processName = names.pop();

    if (DEMO_MODE) {
      terminateProcesses(names, callback);
      return;
    }

    execFile('taskkill', ['/F', '/IM', `${processName}.exe`], (error) => {
      if (error) {
        console.error(`Error stopping process ${processName}:`, error);
      }
      terminateProcesses(names, callback);
    });
  };

  terminateProcesses(processNames.slice(), () => {
    const terminatedExecutables = processNames.map((processName) => processName.split('.exe')[0]);
    const message = terminatedExecutables.join(', ');
    res.send(message);
  });
});

app.listen(port, () => {
  console.log(`Task Manager app is running on port ${port}${DEMO_MODE ? ' (DEMO_MODE)' : ''}`);
});
