let socket = io("/admin");

let domContentLoadedPromise = new Promise((resolve, reject) => {
    document.addEventListener("DOMContentLoaded", function(event) {
        resolve();
    });
});

function generateClientRow(clientData) {
    let row = document.createElement('tr');
    row.id = `client-row-${clientData.clientId}`;
    let connected = !!clientData.socketId;
    row.classList.toggle('connected', connected);
    row.innerHTML = `
        <td>${clientData.clientId}</td>
        <td>${clientData.socketId}</td>
        <td>${connected ? `<a href="javascript:forceDisconnectClient('${clientData.clientId}')">force disconnect</a>` : ''}</td>
    `;
    return row;
}

socket.on("fullSync", (data) => {
    document.getElementById('content').innerHTML = `<h2>Clients</h2><table id="client-list"></table>`;
    let clientList = document.getElementById("client-list");
    for (let clientData of data.clients) {
        clientList.appendChild(generateClientRow(clientData));
    }
});

socket.on("clientDisconnected", (data) => {
    let row = document.getElementById(`client-row-${clientData.clientId}`);
    row.parentNode.replaceChild(clientList.appendChild(generateClientRow()), row);
});

socket.on("clientConnected", (data) => {
    let row = document.getElementById(`client-row-${clientData.clientId}`);
    row.parentNode.replaceChild(clientList.appendChild(generateClientRow(data)), row);
});

function forceDisconnectClient(clientId) {
    socket.emit('forceDisconnectClient', {
        clientId: clientId
    });
}
