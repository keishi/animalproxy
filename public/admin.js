let socket = io("/admin");

let domContentLoadedPromise = new Promise((resolve, reject) => {
    document.addEventListener("DOMContentLoaded", function(event) {
        resolve();
    });
});

socket.on("fullSync", (data) => {
    let parts = [];
    parts.push('<h2>Clients</h2>');
    parts.push('<ul id="clients-list">');
    let sortedClientIds = Object.keys(data.clients).sort();
    for (let clientId of sortedClientIds) {
        let socketId = data.clients[clientId].socketId;
        parts.push(`<ul id="client-${clientId}"><div>${socketId}</div><a href="javascript:forceDisconnectClient(${clientId})">force disconnect</a></ul>`);
    }
    parts.push('</ul>');
    document.getElementById('content').innerHTML = parts.join('');
});

socket.on("clientDisconnected", (data) => {
    document.getElementById(`client-${data.clientId}`).remove();
});

socket.on("clientConnected", (data) => {
    let frag = document.createDocumentFragment();
    frag.innerHTML = `<ul id="client-${data.clientId}"><div>${data.clientId}</div><a href="javascript:forceDisconnectClient(${data.clientId})">force disconnect</a></ul>`;
    document.getElementById(`clients-list`).appendChild(frag);
});

function forceDisconnectClient(clientId) {
    socket.emit('forceDisconnectClient', {
        clientId: clientId
    });
}
