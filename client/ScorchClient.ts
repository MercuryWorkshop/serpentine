// a drop-in serverless replacement for https://github.com/tomphttp/bare-client which communicates with the molten backend using the Scorch:tm: protocol
import BareClient, { GenericClient, BareBodyInit, BareCache, BareFetchInit, BareHeaders, BareHTTPProtocol, BareManifest, BareMethod, BareResponse, BareResponseFetch, BareWebSocket, BareWSProtocol, urlLike } from "@tomphttp/bare-client";
import { AdbController } from "./adb";
import { RequestResponse } from "./core";

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
        console.log(method, requestHeaders, body, protocol, host, port, path, cache, signal);


        let req = await this.adb.enqueueCommand("REQUEST", {
            url: new URL(protocol.toString() + host + ":" + port + path)
        }) as RequestResponse;

        let result: Response & Partial<BareResponse> = new Response(await b64Decode(req.res.data, req.res.headers["content-type"]), {
            // headers: req.res.headers as HeadersInit,
        });

        console.log(req.res.headers);
        result.rawHeaders = req.res.headers as BareHeaders;
        result.rawResponse = result; // this shouldl be raw




        return result as BareResponse;

    }
    async connect(requestHeaders: BareHeaders, protocol: BareWSProtocol, host: string, port: string | number, path: string): Promise<BareWebSocket> {
        console.log("A<POGN");

        throw "not implemented";
    }

}

async function b64Decode(base64Data, type) {
    var r = await fetch("data:" + "text/plain" + ";base64," + base64Data);

    let blob = await r.blob();
    window.open(await URL.createObjectURL(blob));
    let z = await fetch("data:" + type + ";base64," + base64Data);

    return await z.text();
}
export function createScorchClient(adb: AdbController) {

}