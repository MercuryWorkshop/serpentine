// a drop-in serverless replacement for https://github.com/tomphttp/bare-client which communicates with the molten backend using the Scorch:tm: protocol
import BareClient, { GenericClient, BareBodyInit, BareCache, BareFetchInit, BareHeaders, BareHTTPProtocol, BareManifest, BareMethod, BareResponse, BareResponseFetch, BareWebSocket, BareWSProtocol, urlLike, createBareClient } from "@tomphttp/bare-client";

export class RemoteScorchClient extends BareClient {
  private signal?: AbortSignal;
  callbacks;
  // @ts-ignore
  constructor(_adb: AdbController, _signal?: AbortSignal) {
    var self = Object.create(new.target.prototype)
    // @ts-ignore
    self.adb = _adb;
    // @ts-ignore
    self.signal = _signal;
    self.callbacks = {};


    console.log("registered??");
    addEventListener("message", (event) => {
      console.log(event);
      if (event.data.target == "bareclient") {
        let callback = self.callbacks[event.data.id];

        callback(event.data.value);
      }
    });
    //
    return self;

  }
  async request(method: BareMethod, requestHeaders: BareHeaders, body: BareBodyInit, protocol: BareHTTPProtocol, host: string, port: string | number, path: string, cache: BareCache | undefined, signal: AbortSignal | undefined): Promise<BareResponse> {

    //@ts-ignore
    let clients = (await self.clients.matchAll()).filter(
      (v) => new URL(v.url).pathname === "/a.html",
    )
    if (clients.length < 1)
      return new Response("no clients were available to take your request") as BareResponse;
    let client = clients[0];

    let uuid = crypto.randomUUID();


    if (!requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "text/plain";
    }






    client.postMessage({
      target: "bareclient",
      id: uuid,
      value: {
        url: new URL(protocol.toString() + host + ":" + port + path).toString(),
        headers: requestHeaders || {},
        body: body || "",
        method,
      },
    });

    // console.log("want uuid" + uuid);
    let req: any = await new Promise((resolve) => {
      this.callbacks[uuid] = resolve;
    });
    if ("error" in req) {
      console.error(atob(req.error));
      let result: Response & Partial<BareResponse> = new Response(atob(req.error));

      // console.log(req.res.headers);
      result.rawHeaders = {} as BareHeaders;
      result.rawResponse = result; // this shouldl be raw
      return result as BareResponse;
    }

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
