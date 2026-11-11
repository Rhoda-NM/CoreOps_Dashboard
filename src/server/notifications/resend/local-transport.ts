import "server-only";
import http from "node:http";
import { requireResendEngineering } from "./release";
export type HttpResult={status:number;headers:Headers;body:Buffer};
// No default fetch transport, hostname resolution, HTTPS forwarding or redirects.
export class LocalResendMockTransport {
 private origin:URL;
 constructor(origin:string){requireResendEngineering();this.origin=new URL(origin);if(this.origin.protocol!=="http:"||this.origin.hostname!=="127.0.0.1"||!this.origin.port||this.origin.username||this.origin.password||this.origin.pathname!=="/"||this.origin.search||this.origin.hash)throw new Error("Numeric loopback mock required");}
 request(path:string,method:"POST"|"GET",headers:Record<string,string>,body:string|undefined,signal:AbortSignal):Promise<HttpResult>{
  requireResendEngineering();if(!/^\/emails(?:\/[a-f0-9-]{36})?$/.test(path))throw new Error("Unsupported Resend path");
  return new Promise((resolve,reject)=>{
   const req=http.request({hostname:"127.0.0.1",port:this.origin.port,path,method,headers,signal},res=>{const chunks:Buffer[]=[];let size=0;res.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>65536){req.destroy(new Error("Mock response exceeded bound"));return;}chunks.push(chunk);});res.on("error",reject);res.on("end",()=>{const h=new Headers();for(const [k,v]of Object.entries(res.headers))if(v!==undefined)h.set(k,Array.isArray(v)?v.join(","):v);resolve({status:res.statusCode??0,headers:h,body:Buffer.concat(chunks)});});});
   req.on("error",reject);if(body)req.write(body);req.end();
  });
 }
}
