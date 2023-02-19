// import openWindow, { deleteWindow } from "corium/src/hooks";
// import { Win, openWindow } from "corium";
// import BareClient, { createBareClient } from "@tomphttp/bare-client";
// import { ScorchClient } from "./ScorchClient";

// import { AdbController } from "../client/adb";
// import { MoltenCore } from "../client/core";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import AdbWebUsbBackend, {

} from "@yume-chan/adb-backend-webusb";
import {
    Adb,
    AdbPacketInit,
    decodeUtf8,
    WritableStream,
} from "@yume-chan/adb";
// import {
//     InspectStream,
//     pipeFrom,
//     ReadableStream,
//     WritableStream
// } from "@yume-chan/stream-extra";

window.onload = () => {
    document.querySelector("#start")!.addEventListener("click", async () => {
        const credentialStore = new AdbWebCredentialStore();
        const device = await AdbWebUsbBackend.requestDevice();
        const streams = await device!.connect();
        // console.log(streams);
        const adb = await Adb.authenticate(streams, credentialStore, undefined);

        let socket = await adb.createSocket("tcp:1234");
        let writable = socket.writable.getWriter();
        socket.readable.pipeTo(new WritableStream({
            write: chunk => {
                console.log(decodeUtf8(chunk));
                // writable.write(new TextEncoder().encode("ok"));
            }
        }));
        // writable.write(new TextEncoder().encode("ok"));


        window['writer'] = writable;

        window['sock'] = socket;


        // let adb = await new AdbController().start();
        // console.log("asd");
        // let abort = new AbortController();

        // let client = new ScorchClient(adb, abort.signal);

        // let frame = (document.getElementById("proxyframe")! as HTMLIFrameElement).contentWindow as unknown as Win;
        // let window = openWindow(new Request("https://www.google.com"), "_self", frame, client as BareClient, "replace");
        // console.log("Asd");


        window["adb"] = adb;
        window["win"] = window;
    });
};

