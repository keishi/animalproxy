let socket = io("/admin");

let domContentLoadedPromise = new Promise((resolve, reject) => {
    document.addEventListener("DOMContentLoaded", function(event) {
        resolve();
    });
});

function generateClientRow(clientData) {
    let frag = document.createDocumentFragment();
    let connected = !!data.socketId;
    frag.innerHTML = `<tr id="client-row-${clientData.clientId}">
        <td>${data.clientId}</td>
        <td>${data.socketId}</td>
        <td>${connected ? `<a href="javascript:forceDisconnectClient('${data.clientId}')">force disconnect</a>` : ''}</td>
    </tr>`;
    return frag;
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
