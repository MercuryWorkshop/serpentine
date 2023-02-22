// import openWindow, { deleteWindow } from "corium/src/hooks";
import { Win, openWindow } from "corium";
import BareClient, { createBareClient } from "@tomphttp/bare-client";
import { ScorchClient } from "./ScorchClient";
import { AdbController } from "./adb";
// import { MoltenCore } from "../client/core";

window.onload = () => {
    document.querySelector("#start")!.addEventListener("click", async () => {


        let adb = await new AdbController().start();
        // console.log("asd");

        console.log("Asd");
        adb.connect();

        window["adb"] = adb;
    });
};
// window["rw"] =

window["a"] = (s) => {
    window["adb"].connect();

    let abort = new AbortController();

    let client = new ScorchClient(window["adb"], abort.signal);


    let frame = (document.getElementById("proxyframe")! as HTMLIFrameElement).contentWindow as unknown as Win;
    let indow = openWindow(new Request(s), "_self", frame, client as BareClient, "replace");

    window["win"] = indow;
}

