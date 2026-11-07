import { ImageResponse } from "next/og";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function AppleIcon() {
  return new ImageResponse(<div style={{display:"flex",width:"100%",height:"100%",background:"#143D3B",alignItems:"center",justifyContent:"center"}}><svg width="130" height="130" viewBox="0 0 40 40"><path d="m9 13 6 15 5-11 5 11 6-15" stroke="#F7F8F5" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="13" r="2.5" fill="#7CE0C9"/><circle cx="20" cy="17" r="2.5" fill="#7CE0C9"/><circle cx="31" cy="13" r="2.5" fill="#7CE0C9"/></svg></div>, size);
}
