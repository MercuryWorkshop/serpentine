import { AxiosResponse } from "axios";
import { AdbController } from "./adb";

export class MoltenCore {
    frame: HTMLIFrameElement;
    currentURL: string | null;
    adb: AdbController;
    constructor(_adb: AdbController, options: MoltenOptions) {
        this.frame = options.frame;
        this.adb = _adb;
    }

    async visit(url: string) {
        this.currentURL = url;

        let req: any = await this.adb.dispatchCommand("REQUEST", {
            url
        });
        console.log(req);
        this.frame.contentDocument?.write(req.res.data);
    }
}

export interface MoltenOptions {
    frame: HTMLIFrameElement;
}