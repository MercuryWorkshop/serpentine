import { Axios, AxiosResponse } from "axios";
import { AdbController } from "./adb";
const wait = (t: number) => new Promise<void>((resolve) => setTimeout(resolve, t));

export class MoltenCore {
    frame: HTMLIFrameElement;
    doc: Document;
    currentURL: URL | null;
    adb: AdbController;

    blobcache: { [key: string]: string } = {};

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
        let docData = u_atob(req.data);
        let rewritten = await this.rewriteDoc(docData);
        this.doc.write(rewritten);
        this.insertHooks();
        this.doc.close();

    }

    async rewriteDoc(docData: string): Promise<string> {
        let doc = document.createElement("html");
        doc.innerHTML = docData;
        let elms = doc.querySelectorAll("*");
        for (let node of elms) {
            await this.nodeRewrite(node);
        }
        return doc.innerHTML;
    }

    insertHooks() {
        var mutationObserver = new MutationObserver(async (mut) => {
            if (!this.currentURL) return;
            var addedNodes: Node[] = [], removedNodes: Node[] = [];
            mut.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes));
            mut.forEach(record => record.removedNodes.length & removedNodes.push(...record.removedNodes));

            for (let node of addedNodes) {
                await this.nodeRewrite(node);
            }
        });
        mutationObserver.observe(this.doc, { childList: true, subtree: true })
    }

    async nodeRewrite(node: Node) {
        if (!(node instanceof HTMLAnchorElement)) {
            this.propRewrite(node, "href");
        }
        this.propRewrite(node, "src");
        this.propRewrite(node, "srcset", false);
        await wait(50); // adb crashes if we don't

    }

    async propRewrite(node: Node, propname: string, standardSrc: boolean = true) {

        if (!this.currentURL) return;
        if (!(propname in node) || !node[propname]) return;

        let src = node[propname] as string;
        if (!standardSrc) {
            src = "file:/" + src;
        }
        console.log(src);
        let propUrl = new URL(src);


        node[propname] = await this.blobRewrite(propUrl);
    }
    async blobRewrite(url: URL): Promise<string> {
        let trimmedPathname = url.pathname;
        trimmedPathname = trimmedPathname.substring(1)
        let rewritten = this.currentURL!.toString() + trimmedPathname;

        if (rewritten in this.blobcache) {
            return this.blobcache[rewritten];
        }

        console.log(rewritten);
        let resp: AxiosResponse = await this.GET(rewritten);
        let blob = await b64toBlob(resp.data, resp.headers["content-type"]);

        this.blobcache[rewritten] = blob;
        return blob;
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