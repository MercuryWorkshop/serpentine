// a drop-in serverless replacement for https://github.com/tomphttp/bare-client which communicates with the molten backend using the Scorch:tm: protocol
import BareClient, { GenericClient, BareBodyInit, BareCache, BareFetchInit, BareHeaders, BareHTTPProtocol, BareManifest, BareMethod, BareResponse, BareResponseFetch, BareWebSocket, BareWSProtocol, urlLike, createBareClient } from "@tomphttp/bare-client";
import { AdbController } from "./adb";

export class ScorchClient extends BareClient {
    private adb: AdbController;
    private signal?: AbortSignal;
    // @ts-ignore
    constructor(_adb: AdbController, _signal?: AbortSignal) {
        // i can't get it to duck type for some reason, and it's not like there's just an interface lying around sooooooo
        var self = Object.create(new.target.prototype)
        // @ts-ignore
        self.adb = _adb;
        // @ts-ignore
        self.signal = _signal;
        return self;
    }
    async request(method: BareMethod, requestHeaders: BareHeaders, body: BareBodyInit, protocol: BareHTTPProtocol, host: string, port: string | number, path: string, cache: BareCache | undefined, signal: AbortSignal | undefined): Promise<BareResponse> {
        // console.log(method, requestHeaders, body, protocol, host, port, path, cache, signal);

        // let cli = await createBareClient("https://el.riftriot2.repl.co/bare/");
        // let r = await cli.request(method, requestHeaders, body, protocol, host, port, path, cache, signal);

        // return r;
        // console.log(r);

        if (!requestHeaders["Content-Type"]) {
            requestHeaders["Content-Type"] = "text/plain";
        }
        let req = await this.adb.dispatchCommand("REQUEST", {
            url: new URL(protocol.toString() + host + ":" + port + path),
            headers: requestHeaders || {},
            body: body || "",
            method,
        }) as any;
        console.log("dispatching");


        let headers = req.headers;
        headers["Content-Type"] = headers["content-type"];


        let b64hack = await fetch("data:" + headers["Content-Type"] + ";base64," + req.data);

        let result: Response & Partial<BareResponse> = new Response(b64hack.body, {
            status: req.status,
            // statusText: "OK", //todo obviously
            headers: headers,
        });

        // console.log(req.res.headers);
        result.rawHeaders = headers as BareHeaders;
        result.rawResponse = result; // this shouldl be raw



        return result as BareResponse;

    }
    async connect(requestHeaders: BareHeaders, protocol: BareWSProtocol, host: string, port: string | number, path: string): Promise<BareWebSocket> {
        throw "not implemented";
    }

}


// example {accept-ranges=[bytes], age=[226414], cache-control=[max-age=604800], content-type=[text/html; charset=UTF-8], date=[Sun, 19 Feb 2023 19:14:29 GMT], etag=["3147526947"], expires=[Sun, 26 Feb 2023 19:14:29 GMT], last-modified=[Thu, 17 Oct 2019 07:18:26 GMT], server=[ECS (cha/81DE)], vary=[Accept-Encoding], x-cache=[HIT]}
function javaparse(_raw: string): { [index: string]: string } {
    let raw = _raw.substring(1, _raw.length - 1);

    let headers = {};
    let i = 0;
    while (i < raw.length) {
        let propbuf = "";
        // read from current cursor all the way to a '='
        while (i < raw.length) {
            let chr = raw[i];
            if (chr == "=") {
                break;
            } else {
                propbuf += chr;
            }
            i++;
        }
        // skip the "=[", heading directly to the prop's value
        i += 2;

        // read from cursor all the way to "]"
        let valbuf = "";
        let depth = 0;
        while (i < raw.length) {
            let chr = raw[i];
            if (chr == "]" && depth == 0) {
                break;
            } else {
                if (chr == "[") {
                    depth += 1;
                }
                if (chr == "]") {
                    depth -= 1;
                }
                valbuf += chr;
            }
            i++;
        }
        // skip "], "
        i += 3;
        headers[propbuf] = valbuf;
    }
    return headers;

}