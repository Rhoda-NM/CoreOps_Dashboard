import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { open, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { requireResendEngineering } from "./release";
import { sha } from "../envelope";
// Local fixture implementation of a future independently durable append-only witness.
// Production storage/key/attestation implementations intentionally do not exist.
export type WitnessRecord={sequence:number;previous:string;kind:"INTENT"|"ACCEPTED"|"UNKNOWN"|"CALLBACK"|"SUPPRESSION";operation:string;digest:string;mac:string};
export class LocalRestoreWitness {
 private file:string;private tail:Promise<unknown>=Promise.resolve();
 constructor(directory:string,private key:Buffer){requireResendEngineering();if(!/^\/tmp\/workflowconnect-nd-ledger-[a-f0-9-]{36}$/.test(directory)||key.length!==32)throw new Error("Isolated witness fixture required");this.file=join(directory,"witness.jsonl");}
 private mac(value:Omit<WitnessRecord,"mac">){return createHmac("sha256",this.key).update(JSON.stringify(value)).digest("hex");}
 async records(){let raw:string;try{raw=await readFile(this.file,"utf8");}catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return [];throw e;}if(raw.length>4*1024*1024)throw new Error("Witness fixture review bound exceeded");const lines=raw.split("\n").filter(Boolean),records:WitnessRecord[]=[];for(const line of lines){const r=JSON.parse(line) as WitnessRecord;const {mac,...value}=r;const expected=this.mac(value);if(!/^[a-f0-9]{64}$/.test(mac)||!timingSafeEqual(Buffer.from(mac,"hex"),Buffer.from(expected,"hex"))||r.sequence!==records.length+1||r.previous!==(records.at(-1)?.mac??"GENESIS")||!(/^[a-f0-9]{64}$/).test(r.digest))throw new Error("Witness integrity failure");records.push(r);}return records;}
 append(kind:WitnessRecord["kind"],operation:string,digest:string){
  const task=this.tail.then(async()=>{requireResendEngineering();if(operation.length>200||!(/^[a-f0-9]{64}$/).test(digest))throw new Error("Invalid witness record");await mkdir(this.file.slice(0,this.file.lastIndexOf("/")),{mode:0o700,recursive:true});const records=await this.records(),old=records.find(r=>r.operation===operation);if(old){if(old.kind!==kind||old.digest!==digest)throw new Error("Witness operation conflict");return old;}
   const value={sequence:records.length+1,previous:records.at(-1)?.mac??"GENESIS",kind,operation,digest},record={...value,mac:this.mac(value)},file=await open(this.file,"a",0o600);try{await file.writeFile(JSON.stringify(record)+"\n");await file.sync();}finally{await file.close();}return record;
  });this.tail=task.catch(()=>{});return task;
 }
 async requireAdmission(checkpoint:{sequence:number;mac:string},app:{operation:string;digest:string}[]){const records=await this.records(),last=records.at(-1);if(checkpoint.sequence!==records.length||checkpoint.mac!==(last?.mac??"GENESIS")||records.some(r=>!app.some(a=>a.operation===r.operation&&a.digest===r.digest)))throw new Error("Restore quarantined: external witness differs");return {watermark:records.length,root:last?.mac??"GENESIS",manifestHash:sha(JSON.stringify(app))};}
}
export function createProductionRestoreWitness():never {throw new Error("Independent production witness and admission are unconfigured and unapproved");}
