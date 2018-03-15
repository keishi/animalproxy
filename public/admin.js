let socket = io("/admin");

let domContentLoadedPromise = new Promise((resolve, reject) => {
    document.addEventListener("DOMContentLoaded", function(event) {
        resolve();
    });
});

function generateClientRow(clientData) {
    let row = document.createElement('tr');
    row.id = `client-row-${clientData.clientId}`;
    row.classList.add('client-row');
    let connected = !!clientData.socketId;
    row.classList.toggle('connected', connected);
    row.innerHTML = `
        <td>${clientData.clientId}</td>
        <td>${clientData.socketId}</td>
        <td>${connected ? `<button class="force-disconnect-button" onclick="forceDisconnectClient('${clientData.clientId}')"><i class="material-icons">cancel</i></button>` : ''}</td>
    `;
    return row;
}

socket.on("fullSync", (data) => {
    document.getElementById('content').innerHTML = `<h2>Clients</h2><table id="client-list"><thead><tr><th>Client ID</th><th>Socket ID</th><th style="width: 24px"></th><tr></thead></table>`;
    let clientList = document.getElementById("client-list");
    for (let clientData of data.clients) {
        clientList.appendChild(generateClientRow(clientData));
    }
});

socket.on("clientDisconnected", (clientData) => {
    let row = document.getElementById(`client-row-${clientData.clientId}`);
    row.parentNode.replaceChild(generateClientRow(clientData), row);
});

socket.on("clientConnected", (clientData) => {
    let row = document.getElementById(`client-row-${clientData.clientId}`);
    row.parentNode.replaceChild(generateClientRow(clientData), row);
});

function forceDisconnectClient(clientId) {
    socket.emit('forceDisconnectClient', {
        clientId: clientId
    });
}
