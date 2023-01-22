import { AdbController } from "../client/adb";
import { MoltenCore } from "../client/core";

window.onload = () => {
    document.querySelector("#start")!.addEventListener("click", async () => {
        let adb = await new AdbController().start();
        let proxy = new MoltenCore(adb, {
            frame: document.querySelector("#proxyframe")!
        });

        window["adb"] = adb;
        window["proxy"] = proxy;
    });
};