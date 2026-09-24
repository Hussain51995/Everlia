import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props
});

export function SendIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m3.7 4.1 16.6 7.9-16.6 7.9 3.2-6.7 7.1-1.2-7.1-1.2-3.2-6.7Z" /></svg>;
}
export function MailIcon(props: IconProps) {
  return <svg {...base(props)}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>;
}
export function CalendarIcon(props: IconProps) {
  return <svg {...base(props)}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
}
export function GiftIcon(props: IconProps) {
  return <svg {...base(props)}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7"/><path d="M7.5 8C6.1 8 5 6.9 5 5.5A2.5 2.5 0 017.5 3c2 0 4.5 5 4.5 5s2.5-5 4.5-5A2.5 2.5 0 0119 5.5C19 6.9 17.9 8 16.5 8"/></svg>;
}
export function HomeIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
export function ClockIcon(props: IconProps) {
  return <svg {...base(props)}><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>;
}
export function ChartIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M5 20V10M12 20V4M19 20v-8"/></svg>;
}
export function UsersIcon(props: IconProps) {
  return <svg {...base(props)}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M14.5 15c3.2.2 5.5 2 5.5 5"/></svg>;
}
export function ArrowIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
}
export function CheckIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m5 12 4 4L19 6"/></svg>;
}
export function PlayIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m9 7 8 5-8 5V7Z"/></svg>;
}
export function MenuIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}
export function CloseIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m6 6 12 12M18 6 6 18"/></svg>;
}
export function LinkedInIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>;
}
export function InstagramIcon(props: IconProps) {
  return <svg {...base(props)}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
}
export function YouTubeIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>;
}
export function LockIcon(props: IconProps) {
  return <svg {...base(props)}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}
export function EyeIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
export function EyeOffIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
export function SearchIcon(props: IconProps) {
  return <svg {...base(props)}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
export function BellIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
export function TrendingUpIcon(props: IconProps) {
  return <svg {...base(props)}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
export function DollarSignIcon(props: IconProps) {
  return <svg {...base(props)}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
}
export function FilterIcon(props: IconProps) {
  return <svg {...base(props)}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
}
export function PlusIcon(props: IconProps) {
  return <svg {...base(props)}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
export function ChevronDownIcon(props: IconProps) {
  return <svg {...base(props)}><polyline points="6 9 12 15 18 9"/></svg>;
}
export function ChevronRightIcon(props: IconProps) {
  return <svg {...base(props)}><polyline points="9 18 15 12 9 6"/></svg>;
}
export function RefreshCwIcon(props: IconProps) {
  return <svg {...base(props)}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}
export function DownloadIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
export function SparklesIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>;
}
export function BuildingIcon(props: IconProps) {
  return <svg {...base(props)}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/></svg>;
}
export function UserIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
export function CheckCircleIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
export function AlertCircleIcon(props: IconProps) {
  return <svg {...base(props)}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
export function LayoutDashboardIcon(props: IconProps) {
  return <svg {...base(props)}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
}
export function LogOutIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}


