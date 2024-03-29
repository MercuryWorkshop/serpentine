import { Adb, AdbSocket, decodeUtf8, WritableStream } from "@yume-chan/adb";
import AdbWebUsbBackend from "@yume-chan/adb-backend-webusb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import Buffer from "buffer";
window["Buf"] = Buffer;
const wait = (t: number) => new Promise<void>((resolve) => setTimeout(resolve, t));

export class AdbController {
    dec: TextDecoder;
    enc: TextEncoder;
    adb: Adb;
    socket: AdbSocket;
    writer: WritableStreamDefaultWriter;

    callbacks: Function[] = [];
    // commandQueue: { command: string, data: object, resolve: Function }[] = [];



    constructor() {
        this.dec = new TextDecoder();
        this.enc = new TextEncoder();
    }
    async start() {
        const credentialStore = new AdbWebCredentialStore();
        const device = await AdbWebUsbBackend.requestDevice();
        const streams = await device!.connect();

        this.adb = await Adb.authenticate(streams, credentialStore, undefined);
        return this;
    }


    async tryAccSocket(tries: number): Promise<AdbSocket | null> {
        try {
            return await this.adb.createSocket("tcp:1234");
        } catch {
            if (tries > 0) {
                await wait(100);
                return this.tryAccSocket(tries - 1);
            } else
                return null;
        }
    }
    async connect(tries: number): Promise<AdbController | null> {
        let socketresult = await this.tryAccSocket(tries);
        if (!socketresult) {
            console.error(`Couldn't connect to socket after ${tries} tries`)
            return null;
        }
        this.socket = socketresult;
        this.writer = this.socket.writable.getWriter();

        let pipebuf = "";
        this.socket.readable.pipeTo(new WritableStream({
            write: bytes => {
                let chunk = decodeUtf8(bytes);
                // console.log(chunk.toString()[chunk.length - 1]);
                if (chunk.includes("\x04")) {
                    let split = chunk.split("\x04");
                    this.handleData(pipebuf + split[0]);
                    pipebuf = split[1];
                } else {
                    pipebuf += chunk;
                }
            }
        }));
        // setTimeout(async () => {
        //     for (; ;) {
        //         await wait(1000);
        //         let com = this.commandQueue.shift();
        //         if (!com) continue;
        //         let id = uuid();
        //         let writePromise = this.write(JSON.stringify({
        //             id,
        //             command: com.command,
        //             ...com.data
        //         }));
        //         console.log("dispatching command " + id);
        //         this.callbacks[id] = com.resolve;
        //     }
        // }, 100);

        return this;
    }




    // async enqueueCommand(command: string, data: object) {
    //     return new Promise((resolve) => {
    //         this.commandQueue.push({
    //             command,
    //             data,
    //             resolve,
    //         });
    //     });
    // }
    async dispatchCommand(command, data: object) {
        let id = uuid();
        this.write(JSON.stringify({
            id,
            command,
            ...data
        }));
        return new Promise((resolve, reject) => {
            this.callbacks[id] = resolve;
        });
    }

    async write(data: string) {
        if (!this.writer) return;
        await this.writer.write(this.enc.encode(data + "\n"));
    }

    async handleData(data) {
        try {
            let json = JSON.parse(data);
            let callback = this.callbacks[json.id];
            if (callback) {
                console.log("responding to command");
                callback(json);
            } else {
                console.error("got a response for a command that does not exist. this should not happen.")
            }
        } catch (e) {
            console.error(e, data);
            let parts = data.split("}}{\"id\"");
            await this.handleData(parts[0] + "}}");
            await this.handleData("{\"id\"" + parts[1]);
        }
    }

}
function uuid() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if (d > 0) {//Use timestamp until depleted
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
