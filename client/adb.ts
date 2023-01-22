import Adb from "./webadb.js"
import { parse, stringify, toJSON, fromJSON } from 'flatted';
import Buffer from "buffer";
window["Buf"] = Buffer;
window["prs"] = parse;
const wait = (t: number) => new Promise<void>((resolve) => setTimeout(resolve, t));

export class AdbController {
    dec: TextDecoder;
    adb: any;
    socket: any;

    callbacks: Function[] = [];

    constructor() {
        this.dec = new TextDecoder();
    }
    async start() {
        let webusb = await Adb.open("WebUSB");
        this.adb = await webusb.connectAdb("host::");
        await this.connect();
        setTimeout(async () => {
            let buffer = "";
            for (; ;) {
                console.log("pollling");
                let resp = await this.read();
                // console.log(resp);
                if (resp) {
                    if (resp.includes("\x04")) {
                        console.log("SPLIT");
                        let split = resp.split("\x04");
                        this.handleData(buffer + split[0]);
                        buffer = split[1];
                    } else {
                        buffer += resp;
                    }
                }
                console.log("done polling");
                await wait(100);
            }
        }, 100);
        return this;
    }
    async connect() {
        if (!this.adb) return;
        this.socket = await this.adb.open("tcp:1337");
    }

    // async eventLoop() {
    //     await this.read();
    // }





    async dispatchCommand(command, data: object) {
        let id = uuid();
        let writePromise = this.write(JSON.stringify({
            id,
            command,
            ...data
        }))
        console.log("dispatching command " + id);
        return new Promise((resolve) => {
            this.callbacks[id] = resolve;
        });
    }

    async write(data: string) {
        if (!this.socket) return;
        let resp = await this.socket.send("WRTE", data);
    }



    async read() {
        if (!this.socket) return;

        let resp = await this.socket.send_receive("OKAY");
        if (resp.cmd == "WRTE") {
            return this.dec.decode(resp.data);
        }
    }

    async handleData(data) {
        let json = parse(atob(data));
        let callback = this.callbacks[json.id];
        if (callback) {
            console.log("responding to command " + json.id);
            callback(json);
        } else {
            console.error("got a response for a command that does not exist. this should not happen.")
        }
        console.log(json);
    }

}
function uuid() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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