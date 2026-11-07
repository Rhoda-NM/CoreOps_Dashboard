import { ImageResponse } from "next/og";
export const alt = "WorkflowConnect — Your business, connected.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", background: "#F7F8F5", color: "#143D3B", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 70 }}><div style={{ display: "flex", alignItems: "center", gap: 20 }}><svg width="58" height="58" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#143D3B"/><path d="m9 13 6 15 5-11 5 11 6-15" stroke="#F7F8F5" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg><span style={{fontSize:34,fontWeight:600}}>WorkflowConnect</span></div><div style={{display:"flex",flexDirection:"column",gap:22}}><div style={{fontSize:78,letterSpacing:-4,lineHeight:1.05,maxWidth:1000}}>Bring your business operations together.</div><div style={{fontSize:27,color:"#52635F"}}>Clients. Projects. Tasks. Teams. Invoicing.</div></div><div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #DCE5DE",paddingTop:22,fontSize:20}}><span>Your business, connected.</span><span>A product by Stravect Systems.</span></div></div>, size);
}
