import { Axios, AxiosResponse } from "axios";
import { AdbController } from "./adb";
import * as CSS from "@adobe/css-tools";
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
        let rewritten = await this.docRewrite(docData);
        this.doc.write(rewritten);
        this.insertHooks();

        this.doc.close();

    }

    async docRewrite(docData: string): Promise<string> {
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
        if (node instanceof HTMLAnchorElement) {
            if (!node.href) return;
            let href = node.href;
            node.href = "javascript:void()";
            node.onclick = () => {
                this.visit(href);
            };
        }
        else {
            this.propRewrite(node, "href");
        }
        this.propRewrite(node, "src");
        this.propRewrite(node, "srcset");
        await wait(150); // adb crashes if we don't

    }

    async propRewrite(node: Node, propname: string) {

        if (!this.currentURL) return;
        if (!(propname in node) || !node[propname]) return;

        let src = node[propname] as string;
        // qualify source needs to change in some edge cases. consider passing around a currentOrigin everywhere;
        node[propname] = await this.blobRewrite(qualifyURL(this.currentURL.origin, src));
    }
    async blobRewrite(absurl: string): Promise<string> {
        let resp: AxiosResponse = await this.GET(absurl);
        let blob;
        console.log(absurl);
        console.log(resp.headers["content-type"]);
        if (resp.headers["content-type"]?.includes("text/css")) {
            let fetched = await fetch("data:" + resp.headers["content-type"] + ";base64," + resp.data);
            let contents = await fetched.text();
            console.log("nawww fr bruh no way")
            blob = URL.createObjectURL(new Blob([await this.rewriteRawCSS(contents)], { type: resp.headers["content-type"] }));
        } else {
            blob = await b64toBlob(resp.data, resp.headers["content-type"]);
        }
        this.blobcache[absurl] = blob;
        return blob;
    }
    async rewriteRawCSS(contents: string): Promise<string> {
        let parsed = CSS.parse(contents);

        for (let rule of parsed.stylesheet.rules) {
            console.log(rule);
            if (rule.type == "import") {
                let strippedhref = rule.import;
                strippedhref = strippedhref.substring(4, strippedhref.length - 2);
                console.log(strippedhref);
                // rule.import = this.blobRewrite(strippedhref);
                // bruh
            }
        }
        console.log("ASKLDHASHDJKLHASDJKASDHKASJHDJKK")
        return CSS.stringify(parsed);
    }



    async GET(url: string): Promise<AxiosResponse> {
        let req = await this.adb.enqueueCommand("REQUEST", {
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
function qualifyURL(tgt, url) {
    var img = document.createElement('img');
    img.src = url;
    url = img.src;
    return url.replace(document.location.origin, tgt);
}