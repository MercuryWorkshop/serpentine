import Net from "net";
import axios, { isCancel, AxiosError } from 'axios';

import { parse, stringify, toJSON, fromJSON } from 'flatted';
const port = 1337;

// Use net.createServer() in your code. This is just for illustration purpose.
// Create a new TCP server.
const server = new Net.Server();
// The server listens to a socket for a client to make a connection request.
// Think of a socket as an end point.
server.listen(port, () => {
    console.log(`Server listening for connection requests on socket localhost:${port}`);
});

// When a client requests a connection with the server, the server creates a new
// socket dedicated to that client.
server.on('connection', (socket) => {
    console.log('A new connection has been established.');

    // Now that a TCP connection has been established, the server can send data to
    // the client by writing to its socket.
    // socket.write('ack');

    // The server can also receive data from the client by reading from its socket.
    socket.on('data', async (chunk) => {
        console.log(`Data received from client: ${chunk.toString()}`);
        let data = JSON.parse(chunk.toString().replace("\n", ""));

        switch (data.command) {
            case "REQUEST":
                requestCommand(data, socket);
        }
    });

    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function () {
        console.log('Closing connection with the client');
    });

    // Don't forget to catch error, for your own sake.
    socket.on('error', function (err) {
        console.log(`Error: ${err}`);
    });
});

async function requestCommand(data, socket) {
    let httpResp = await axios.get(data.url);
    let tcpResp = {
        id: data.id,
        res: httpResp,
    };

    socket.write(stringify(tcpResp));
    console.log("sent response");
}