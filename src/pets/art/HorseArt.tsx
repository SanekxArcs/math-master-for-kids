import { useId } from "react";
import type { Mood } from "@/engine";
import { AccessoryShape } from "./accessories";
import { Halo, MudSplats, Rumble, Sparkles, Tear, Thermometer, Wear, Zzz, origin, type SpeciesArtProps } from "./parts";

const INK = "#482D2B";
const SOCK = "#FFF1D9";
const MUD = [
  "M62 112c5-5 13-2 12 4s-9 7-12 3-4-5 0-7z",
  "M99 126c4-4 12-1 11 4s-7 8-11 4-4-5 0-8z",
  "M128 107c3-4 9-1 8 3s-5 6-8 3-3-4 0-6z",
  "M67 155c3-3 8-1 8 3s-6 5-8 2-2-3 0-5z",
];

/** A standing horse with long lower legs and attached, articulated joints. */
export function Horse({ mood, mud, worn }: SpeciesArtProps) {
  const uid = `horse-${useId()}`;
  const paint = (name: string) => `url(#${uid}-${name})`;
  const back = worn.back;
  return <>
    <defs>
      <linearGradient id={`${uid}-coat`} x1="72" y1="88" x2="112" y2="157" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E0A36D" /><stop offset="0.5" stopColor="#C78552" /><stop offset="1" stopColor="#A76340" />
      </linearGradient>
      <linearGradient id={`${uid}-neck`} x1="137" y1="56" x2="121" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E6AC78" /><stop offset="0.6" stopColor="#CC8B57" /><stop offset="1" stopColor="#B77649" />
      </linearGradient>
      <linearGradient id={`${uid}-face`} x1="144" y1="35" x2="166" y2="81" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EAB683" /><stop offset="0.55" stopColor="#D99A64" /><stop offset="1" stopColor="#BD794E" />
      </linearGradient>
      <linearGradient id={`${uid}-muzzle`} x1="171" y1="61" x2="177" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F6D9B4" /><stop offset="1" stopColor="#E7BB91" />
      </linearGradient>
      <linearGradient id={`${uid}-hair`} x1="125" y1="33" x2="115" y2="112" gradientUnits="userSpaceOnUse">
        <stop stopColor="#704539" /><stop offset="0.55" stopColor="#4E302C" /><stop offset="1" stopColor="#3D2929" />
      </linearGradient>
      <linearGradient id={`${uid}-tail`} x1="48" y1="107" x2="25" y2="155" gradientUnits="userSpaceOnUse">
        <stop stopColor="#674036" /><stop offset="1" stopColor="#412C2A" />
      </linearGradient>
      <linearGradient id={`${uid}-hoof`} x1="0" y1="176" x2="0" y2="185" gradientUnits="userSpaceOnUse">
        <stop stopColor="#66504A" /><stop offset="1" stopColor="#392C2D" />
      </linearGradient>
    </defs>

    <ellipse className="pet-shadow" style={origin(100, 187)} cx="100" cy="187" rx="57" ry="5.5" fill="#483D32" opacity="0.12" />
    <g className="pet-bob" style={origin(100, 185)}>
      <g transform="translate(0 -4)">
      {back === "wings" && <Wear slot="back" worn={worn} at={{ x: 107, y: 97, scale: 0.95 }} />}
      <g className="pet-tail" style={origin(53, 111)}>
        <path d="M57 106C36 99 24 112 26 131c2 12-4 19-12 24 11 7 23 2 29-6 8-12-1-21 6-30l11-7z" fill={paint("tail")} />
        <path d="M48 112c-13 5-11 16-12 25-1 8-5 13-11 16" fill="none" stroke="#A77955" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        <path d="M43 115c-9 8-3 17-8 28M30 151l5-2" fill="none" stroke="#C18D60" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      </g>
      </g>

      {/* Far legs have their own silhouettes, rather than looking like four equal poles. */}
      <path d="M62 120c-9 4-11 16-8 28l4 10-4 19c-1 3 1 5 4 5h7l7-31-4-25z" fill="#A56543" />
      <path d="M53 176h13l1 6c-3 3-12 3-15 1z" fill="#46322D" />
      <path d="M112 120c-3 13-2 23 2 31l-1 27c0 3 3 4 6 4h6l3-37-1-21z" fill="#A96B46" />
      <path d="M112 176h14l1 6c-3 3-12 3-16 1z" fill="#46322D" />

      <g transform="translate(0 -4)">
      <g className="pet-body" style={origin(101, 174)}>
        {/* The neck is behind the barrel; both breathe together to keep the shoulder joined. */}
        <path d="M107 108c13-17 13-36 26-55l24 10c-8 18-14 35-13 61l-23 12z" fill={paint("neck")} />
        <path d="M119 104c7-9 11-19 14-29" fill="none" stroke="#F7CF9A" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
        <path d="M54 101c11-13 26-12 40-8 13 4 21 1 33 4 18 4 24 20 17 34-6 13-20 15-39 16l-32-1c-20-1-30-12-28-26 0-8 3-15 9-19z" fill={paint("coat")} />
        <path d="M48 123c6 13 19 18 37 18h30c14 0 24-4 30-13-4 16-18 21-39 20l-31-1c-19-1-29-10-27-24z" fill="#965B40" opacity="0.28" />
        <path d="M56 104c9-9 19-9 29-6" fill="none" stroke="#FFE0AA" strokeWidth="3.2" strokeLinecap="round" opacity="0.65" />
        <path d="M64 110c-6 7-6 16-1 22" fill="none" stroke="#F0BC84" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        <path d="M129 105c9 6 12 14 8 24" fill="none" stroke="#A26142" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

        <g className="horse-mane">
          <path d="M144 33c-12-4-22 5-21 17-9 7-7 18-10 27-3 11-9 17-10 30 5-2 8-4 10-7l-1 14c9-2 15-11 17-22 3-13 6-25 14-34l11-16z" fill={paint("hair")} />
          <path d="M136 39c-8 4-8 13-10 21-2 11-9 19-10 32" fill="none" stroke="#B17E55" strokeWidth="2.1" strokeLinecap="round" opacity="0.72" />
          <path d="M132 49c-2 10-5 18-8 25M122 83c-2 6-3 14-6 19" fill="none" stroke="#D09A68" strokeWidth="1.15" strokeLinecap="round" opacity="0.5" />
          <path d="M130 66c-2 11-2 18-7 28" fill="none" stroke="#2F2324" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
        </g>

        <Wear slot="neck" worn={worn} at={{ x: 137, y: 94, rotate: 32, scale: 0.82 }} />
        {back === "saddle" && <Wear slot="back" worn={worn} at={{ x: 94, y: 98, scale: 0.95 }} />}
        {back === "cape" && <Wear slot="back" worn={worn} at={{ x: 126, y: 99, scale: 1.02 }} />}
        {back === "hunterSword" && <Wear slot="back" worn={worn} at={{ x: 95, y: 100, rotate: 40, scale: 0.9 }} />}

        <g className="pet-head" style={origin(139, 72)}>
          <g className="pet-ear-alt" style={origin(142, 39)}>
            <path d="M138 42c-5-8-6-19-3-23 7 1 12 10 13 20z" fill="#B4744F" />
            <path d="M140 36c-3-5-4-9-4-12 4 2 7 7 8 12z" fill="#D99F79" />
          </g>
          <g className="pet-ear" style={origin(155, 39)}>
            <path d="M148 40c-2-10 1-20 6-23 6 5 7 14 4 23z" fill="#DE9F6B" />
            <path d="M152 35c-1-5 0-10 2-13 2 4 3 8 1 13z" fill="#A86A55" />
            <path d="M151 27l2-5" stroke="#F2C48E" strokeWidth="1.2" strokeLinecap="round" />
          </g>
          <path d="M133 54c-3-14 6-23 18-23 13 0 18 12 21 21 3 7 13 10 16 17 5 11-3 19-14 17-8-1-14-7-21-9-14-3-21-12-20-23z" fill={paint("face")} />
          <path d="M136 57c1 8 5 13 13 15" fill="none" stroke="#AD6D49" strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />
          <path d="M155 34c5 4 4 12 7 18l11 13c-2 5-6 5-10 2l-11-15c2-8-3-13 3-18z" fill={SOCK} />
          <path d="M171 61c6 0 14 3 17 9 4 8-2 15-10 15-9 0-15-5-19-10 3-8 7-12 12-14z" fill={paint("muzzle")} />
          <path d="M173 64c5-1 9 1 11 3" fill="none" stroke="#FFF0D7" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <path d="M180 70c1-2 5-2 5 0s-2 4-4 3-2-1-1-3z" fill="#9D6853" />
          <path d="M181 69l2 .1" stroke="#734A40" strokeWidth="1.1" strokeLinecap="round" />
          <HorseEye mood={mood} />
          <ellipse cx="157" cy="65" rx="5" ry="2.8" fill={mood === "sick" ? "#B4B879" : "#DA8A70"} opacity={mood === "gone" ? 0 : 0.55} />
          <g className="horse-mouth" style={origin(175, 79)}><HorseMouth mood={mood} /></g>
          <path d="M136 38c5-11 23-13 32 1-7-3-12-2-15 7-4-1-7-4-9-7l-3 5z" fill={paint("hair")} />
          <path d="M141 35c6-4 14-3 19 1" fill="none" stroke="#AC7956" strokeWidth="2" strokeLinecap="round" />
          <path d="M144 38c4-3 8-3 11-2" fill="none" stroke="#D2A475" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
          {mood === "vacation" && !worn.face && <g transform="translate(151 51) scale(.72)"><AccessoryShape id="sunglasses" profile /></g>}
          <Wear slot="face" worn={worn} at={{ x: 151, y: 51, scale: 0.72, profile: true }} />
          <Wear slot="hat" worn={worn} at={{ x: 148, y: 31, rotate: 8, scale: 0.65 }} />
          {mood === "sad" && <Tear x={153} y={60} />}
        </g>
      </g>
      </g>

      {/* Near legs overlap the barrel, making the hip and shoulder feel attached. */}
      <g className="horse-hindleg" style={origin(67, 128)}>
        <path d="M65 120c-10 1-15 14-12 24l12 14-5 19c-1 4 1 5 5 5h7l6-29c1-4-3-9-6-13l5-14z" fill={paint("coat")} />
        <path d="M64 160l8-1-1 18h-10z" fill={SOCK} />
        <path d="M61 175c3 1 7 1 11 0l2 7c-4 3-13 4-17 1z" fill={paint("hoof")} />
        <path d="M62 179l8-.5" stroke="#AC9180" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M60 129c-3 6-2 11 2 16" fill="none" stroke="#E5AF77" strokeWidth="2.3" strokeLinecap="round" />
      </g>
      <g className="horse-foreleg" style={origin(131, 124)}>
        <path d="M126 111c-8 6-7 29 1 42l-1 24c0 4 3 5 6 5h7l1-29c0-19 1-36-7-42z" fill={paint("coat")} />
        <path d="M127 161c4 2 8 2 12 0v16h-13z" fill={SOCK} />
        <path d="M126 175c4 2 9 2 13 0l3 7c-4 3-14 4-18 1z" fill={paint("hoof")} />
        <path d="M128 179l9 .2" stroke="#B69B85" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M130 128c-2 9-1 17 2 23" fill="none" stroke="#EAB47B" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <MudSplats spots={MUD} count={mud} />
      {mood === "asleep" && <Zzz x={167} y={24} />}
      {mood === "gone" && <Halo x={151} y={9} />}
      {mood === "hungry" && <Rumble x={91} y={161} color="#9D684C" />}
      {mood === "happy" && <Sparkles points={[[32, 63, 0], [184, 28, 1.4]]} color="#F5D78F" />}
    </g>
  </>;
}

function HorseEye({ mood }: { mood: Mood }) {
  if (mood === "asleep" || mood === "gone") return <g stroke={INK} fill="none" strokeLinecap="round">
    <path d="M144 52q7 6 14-1" strokeWidth="2.2" /><path d="M145 54l-2 2M149 55l-1 2" strokeWidth="1.2" />
  </g>;
  const tired = mood === "sick" || mood === "sad";
  return <>
    <g className="pet-eye" style={origin(151, 51)}>
      <path d="M144 49c2-7 12-8 15 0 2 6-2 12-7 12-6 0-9-6-8-12z" fill="#FFF9E9" />
      <ellipse cx="153" cy="51" rx="4.8" ry="6.3" fill="#754B35" />
      <ellipse cx="154" cy="51" rx="3.1" ry="4.8" fill={INK} />
      <circle cx="155" cy="48" r="1.8" fill="#FFFDF3" /><circle cx="151.8" cy="54" r="0.8" fill="#FFFDF3" opacity="0.8" />
      {tired && <path d="M143 45h18v7q-9-5-18 1z" fill="#D49767" />}
      <path d={tired ? "M144 51q7-4 14 0" : "M144 49c2-6 10-7 14-1"} stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />
    </g>
    <path d={tired ? "M144 42q5 3 10 1" : "M145 41q5-3 9 0"} stroke="#8C563D" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </>;
}

function HorseMouth({ mood }: { mood: Mood }) {
  if (mood === "sick") return <><path d="M171 80q5-3 10-1" stroke="#9C6550" strokeWidth="1.6" fill="none" strokeLinecap="round" /><Thermometer x={178} y={80} /></>;
  if (mood === "hungry") return <ellipse cx="176" cy="80" rx="2.5" ry="2.8" fill="#855142" />;
  if (mood === "happy") return <><path d="M169 77q7 5 15 0c-3 7-10 8-15 0z" fill="#7F493C" /><path d="M173 81q3-2 6 0" stroke="#E59C8A" strokeWidth="1.5" strokeLinecap="round" /><path d="M168 76l-1 2" stroke="#BA8969" strokeWidth="1.2" strokeLinecap="round" /></>;
  return <path d={mood === "sad" ? "M170 81q6-4 12-1" : mood === "gone" ? "M172 80h9" : "M169 78q6 4 13 0"} stroke="#99634E" strokeWidth="1.6" fill="none" strokeLinecap="round" />;
}
