import { Axios, AxiosResponse } from "axios";
import { AdbController } from "./adb";

export class MoltenCore {
    frame: HTMLIFrameElement;
    doc: Document;
    currentURL: URL | null;
    adb: AdbController;

    constructor(_adb: AdbController, options: MoltenOptions) {
        this.frame = options.frame;
        this.doc = options.frame.contentDocument!;
        this.adb = _adb;
    }

    async visit(url: string) {
        // let docChildren = this.frame.contentDocument?.children!;
        // for (var i = 0; i < docChildren.length; i++) {
        //     this.frame.contentDocument?.children[i].remove();
        // }


        let req: AxiosResponse = await this.GET(url);

        this.currentURL = new URL(req.request.protocol + req.request.host + req.request.path); //todo: params?
        // we take the url from the request in case of a redirect.
        console.log(req);
        this.doc.open();
        this.insertHooks();
        this.doc.write(u_atob(req.data));
        this.doc.close();

    }

    insertHooks() {
        var mutationObserver = new MutationObserver(async (mut) => {
            if (!this.currentURL) return;
            var addedNodes: Node[] = [], removedNodes: Node[] = [];
            if (window["amg"]) return;
            // window["amg"] = true;
            mut.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes));
            mut.forEach(record => record.removedNodes.length & removedNodes.push(...record.removedNodes));

            for (let node of addedNodes) {
                if ("src" in node && node.src != "") {
                    let srcUrl = new URL(node.src as string);

                    let trimmedPathname = srcUrl.pathname;
                    trimmedPathname = trimmedPathname.substring(1)
                    let rewritten = this.currentURL.toString() + trimmedPathname;


                    console.log(rewritten);
                    let resp: AxiosResponse = await this.GET(rewritten);
                    let blob = await b64toBlob(resp.data, resp.headers["content-type"]);
                    node.src = blob;

                }
                if ("href" in node && node.href != "") {
                    let srcUrl = new URL(node.href as string);

                    let trimmedPathname = srcUrl.pathname;
                    trimmedPathname = trimmedPathname.substring(1)
                    let rewritten = this.currentURL.toString() + trimmedPathname;


                    console.log(rewritten);
                    let resp: AxiosResponse = await this.GET(rewritten);
                    let blob = await b64toBlob(resp.data, resp.headers["content-type"]);
                    node.href = blob;

                }
            }
        });
        mutationObserver.observe(this.doc, { childList: true, subtree: true })
    }



    async GET(url: string): Promise<AxiosResponse> {
        let req = await this.adb.dispatchCommand("REQUEST", {
            url
        }) as RequestResponse;
        return req.res;
    }
}
async function b64toBlob(base64Data, type) {
    const r = await fetch("data:" + type + ";base64," + base64Data);
    const blob = await r.blob();
    return URL.createObjectURL(blob);
}
function u_atob(ascii) {
    return new TextDecoder().decode(Uint8Array.from(atob(ascii), c => c.charCodeAt(0)));
}
export interface RequestResponse { id: number, res: AxiosResponse }

export interface MoltenOptions {
    frame: HTMLIFrameElement;
}