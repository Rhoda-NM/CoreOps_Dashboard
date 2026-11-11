const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const {zip,csv}=require('../src/server/data-access/zip.ts');
test('independent Python ZIP/CRC and CSV readers validate UTF-8, quoting and formula safety',()=>{
 const rows=[{id:'stable-id',text:'=1+1',money:'123.45'},{id:'utf8',text:'客户\n"quoted"',money:'0.10'}];
 const archive=zip({'export.json':JSON.stringify(rows),'records.csv':csv(rows,['id','text','money'])});
 const result=spawnSync('python3',['-c',`
import sys,io,zipfile,json,csv
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:
 assert z.testzip() is None
 rows=json.loads(z.read('export.json'))
 data=list(csv.DictReader(io.StringIO(z.read('records.csv').decode('utf-8'))))
 assert rows[0]['text']=='=1+1'
 assert data[0]['text']=="'=1+1"
 assert data[0]['money']=='123.45'
 assert data[1]['text']==rows[1]['text']
 assert data[1]['money']=='0.10'
`],{input:archive});
 assert.ifError(result.error);assert.equal(result.status,0,result.stderr.toString());
});
