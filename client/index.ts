import { openWindow, deleteWindow } from "corium";
import BareClient, { createBareClient } from "@tomphttp/bare-client";
import { ScorchClient } from "./ScorchClient";
import { AdbController } from "./adb";
import { Win } from "corium";

window.onload = () => {
    document.querySelector("#start")!.addEventListener("click", async () => {


        let adb = await new AdbController().start();
        // console.log("asd");

        console.log("Asd");
        adb.connect(10);

        window["adb"] = adb;
    });
};

window["a"] = (s) => {

    let abort = new AbortController();

    let client = new ScorchClient(window["adb"], abort.signal);


    let frame = (document.getElementById("proxyframe")! as HTMLIFrameElement).contentWindow as unknown as Win;
    let indow = openWindow(new Request(s), "_self", frame, client as BareClient, "replace");

    window["win"] = indow;
}

