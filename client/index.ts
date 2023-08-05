// import { openWindow, deleteWindow } from "corium";
import BareClient, { createBareClient } from "@tomphttp/bare-client";
import { ScorchClient } from "./ScorchClient";
import { AdbController } from "./adb";
// import { Win } from "corium";

window.onload = () => {
    document.querySelector("#start")!.addEventListener("click", async () => {


        let adb = await new AdbController().start();
        // console.log("asd");

        console.log("Asd");
        adb.connect(10);


        console.log("REGISTERD FOCJ");
        navigator.serviceWorker.addEventListener("message", async (event) => {
            if (event.data?.target == "bareclient") {
                const id = event.data.id;

                event.data.value.url = new URL(event.data.value.url);
                adb.dispatchCommand("REQUEST", event.data.value).then(data => {

                    navigator.serviceWorker.controller?.postMessage({
                        target: event.data.target,
                        id: id,
                        value: data,
                    });
                });
            }
        });
        window["adb"] = adb;
    });
};

