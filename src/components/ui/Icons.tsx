import React from'react';

export const Icons = {
 LogoBadge: () => (
 <svg width="34"height="34"viewBox="0 0 36 36"fill="none"xmlns="http://www.w3.org/2000/svg">
 <rect width="36"height="36"rx="8"fill="#16a34a"/>
 <path d="M12 11h12c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H12c-1.1 0-2-.9-2-2V13c0-1.1.9-2 2-2z"fill="#ffffff"fillOpacity="0.2"/>
 <path d="M18 15v6m-3-3h6"stroke="#ffffff"strokeWidth="2.5"strokeLinecap="round"/>
 <circle cx="18"cy="18"r="3"stroke="#ffffff"strokeWidth="2"/>
 </svg>
 ),

 Search: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <circle cx="11"cy="11"r="8"/>
 <line x1="21"y1="21"x2="16.65"y2="16.65"/>
 </svg>
 ),

 Home: () => (
 <svg width="19"height="19"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
 <polyline points="9 22 9 12 15 12 15 22"/>
 </svg>
 ),

 Monitoring: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
 </svg>
 ),

 Items: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
 <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
 <line x1="12"y1="22.08"x2="12"y2="12"/>
 </svg>
 ),

 Sales: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <circle cx="9"cy="21"r="1"/>
 <circle cx="20"cy="21"r="1"/>
 <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
 </svg>
 ),

 Purchases: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
 <line x1="3"y1="6"x2="21"y2="6"/>
 <path d="M16 10a4 4 0 0 1-8 0"/>
 </svg>
 ),

 Contacts: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
 <circle cx="9"cy="7"r="4"/>
 <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
 <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
 </svg>
 ),

 Employees: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
 <circle cx="9"cy="7"r="4"/>
 <line x1="19"y1="8"x2="19"y2="14"/>
 <line x1="22"y1="11"x2="16"y2="11"/>
 </svg>
 ),

 Accounts: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <line x1="3"y1="21"x2="21"y2="21"/>
 <line x1="3"y1="10"x2="21"y2="10"/>
 <polyline points="5 6 12 3 19 6"/>
 <line x1="4"y1="10"x2="4"y2="21"/>
 <line x1="20"y1="10"x2="20"y2="21"/>
 <line x1="8"y1="14"x2="8"y2="17"/>
 <line x1="12"y1="14"x2="12"y2="17"/>
 <line x1="16"y1="14"x2="16"y2="17"/>
 </svg>
 ),

 Reports: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <line x1="18"y1="20"x2="18"y2="10"/>
 <line x1="12"y1="20"x2="12"y2="4"/>
 <line x1="6"y1="20"x2="6"y2="14"/>
 </svg>
 ),

 Settings: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <circle cx="12"cy="12"r="3"/>
 <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
 </svg>
 ),

 ChevronDown: () => (
 <svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round">
 <polyline points="6 9 12 15 18 9"/>
 </svg>
 ),

 ChevronUp: () => (
 <svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round">
 <polyline points="18 15 12 9 6 15"/>
 </svg>
 ),

 SwitchArrows: () => (
 <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <polyline points="7 15 12 20 17 15"/>
 <polyline points="17 9 12 4 7 9"/>
 </svg>
 ),

 ToggleSidebar: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
 <line x1="3"y1="12"x2="21"y2="12"/>
 <line x1="3"y1="6"x2="21"y2="6"/>
 <line x1="3"y1="18"x2="21"y2="18"/>
 <polyline points="9 16 5 12 9 8"/>
 </svg>
 ),

 CashRegister: () => (
 <svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <rect x="2"y="4"width="20"height="16"rx="2"/>
 <line x1="6"y1="8"x2="10"y2="8"/>
 <line x1="6"y1="12"x2="18"y2="12"/>
 <line x1="6"y1="16"x2="18"y2="16"/>
 </svg>
 ),

 Bell: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
 <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
 </svg>
 ),

 Headset: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
 <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
 </svg>
 ),

 Calculator: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <rect x="4"y="2"width="16"height="20"rx="2"/>
 <line x1="8"y1="6"x2="16"y2="6"/>
 <line x1="16"y1="14"x2="16"y2="18"/>
 <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>
 </svg>
 ),

 Moon: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
 </svg>
 ),

 Sun: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <circle cx="12"cy="12"r="5"/>
 <line x1="12"y1="1"x2="12"y2="3"/>
 <line x1="12"y1="21"x2="12"y2="23"/>
 <line x1="4.22"y1="4.22"x2="5.64"y2="5.64"/>
 <line x1="18.36"y1="18.36"x2="19.78"y2="19.78"/>
 <line x1="1"y1="12"x2="3"y2="12"/>
 <line x1="21"y1="12"x2="23"y2="12"/>
 <line x1="4.22"y1="19.78"x2="5.64"y2="18.36"/>
 <line x1="18.36"y1="5.64"x2="19.78"y2="4.22"/>
 </svg>
 ),

 UserAvatar: () => (
 <svg width="24"height="24"viewBox="0 0 24 24"fill="currentColor">
 <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
 </svg>
 ),

 Refresh: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <polyline points="23 4 23 10 17 10"/>
 <polyline points="1 20 1 14 7 14"/>
 <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
 </svg>
 ),

 ReturnArrow: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="20"height="20"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <polyline points="9 14 4 9 9 4"/>
 <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
 </svg>
 ),

 Truck: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <rect x="1"y="3"width="15"height="13"/>
 <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
 <circle cx="5.5"cy="18.5"r="2.5"/>
 <circle cx="18.5"cy="18.5"r="2.5"/>
 </svg>
 ),

 Receipt: () => (
 <svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/>
 <line x1="8"y1="7"x2="16"y2="7"/>
 <line x1="8"y1="11"x2="16"y2="11"/>
 <line x1="8"y1="15"x2="13"y2="15"/>
 </svg>
 ),

 Boxes: () => (
 <svg width="26"height="26"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
 <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
 <line x1="12"y1="22.08"x2="12"y2="12"/>
 <path d="M7 4.5l10 5.5"/>
 <path d="M7 19.5v-6"/>
 </svg>
 ),

 Edit: () => (
 <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
 <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
 </svg>
 ),

 Eye: () => (
 <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
 <circle cx="12"cy="12"r="3"/>
 </svg>
 ),

 Plus: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <line x1="12"y1="5"x2="12"y2="19"/>
 <line x1="5"y1="12"x2="19"y2="12"/>
 </svg>
 ),

 Filter: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
 </svg>
 ),

 Warehouse: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35a2 2 0 0 1 1.06-1.77l8-4a2 2 0 0 1 1.88 0l8 4A2 2 0 0 1 22 8.35z"/>
 <path d="M2 20h4v-3h12v3h4"/>
 <path d="M9 9h6v6H9z"/>
 <path d="M9 12h6"/>
 </svg>
 ),

 Print: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <polyline points="6 9 6 2 18 2 18 9"/>
 <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
 <rect x="6"y="14"width="12"height="8"/>
 </svg>
 ),

 Check: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <polyline points="20 6 9 17 4 12"/>
 </svg>
 ),

 X: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <line x1="18"y1="6"x2="6"y2="18"/>
 <line x1="6"y1="6"x2="18"y2="18"/>
 </svg>
 ),

 ArrowLeft: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <line x1="19"y1="12"x2="5"y2="12"/>
 <polyline points="12 19 5 12 12 5"/>
 </svg>
 ),

 ArrowRight: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <line x1="5"y1="12"x2="19"y2="12"/>
 <polyline points="12 5 19 12 12 19"/>
 </svg>
 ),

 ClipboardList: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <rect x="8"y="2"width="8"height="4"rx="1"/>
 <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
 <path d="M9 12h6M9 16h6M9 8h6"/>
 </svg>
 ),

 Inbox: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
 <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
 </svg>
 ),

 AlertTriangle: () => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
 <line x1="12"y1="9"x2="12"y2="13"/>
 <line x1="12"y1="17"x2="12.01"y2="17"/>
 </svg>
 ),

 ShieldCheck: () => (
 <svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
 <path d="M9 12l2 2 4-4"/>
 </svg>
 ),

 PlusCircle: () => (
 <svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <circle cx="12"cy="12"r="10"/>
 <line x1="12"y1="8"x2="12"y2="16"/>
 <line x1="8"y1="12"x2="16"y2="12"/>
 </svg>
 ),

 SwapHorizontal: () => (
 <svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <polyline points="17 1 21 5 17 9"/>
 <path d="M3 5h18"/>
 <polyline points="7 23 3 19 7 15"/>
 <path d="M21 19H3"/>
 </svg>
 ),

 BarcodeScan: () => (
 <svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <rect x="3"y="3"width="7"height="7"/>
 <rect x="14"y="3"width="7"height="7"/>
 <rect x="14"y="14"width="7"height="7"/>
 <rect x="3"y="14"width="7"height="7"/>
 </svg>
 ),

 ClockHistory: () => (
 <svg width="20"height="20"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <circle cx="12"cy="12"r="10"/>
 <polyline points="12 6 12 12 16 14"/>
 </svg>
 ),

 BadgeId: () => (
 <svg width="20"height="20"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <rect x="3"y="4"width="18"height="16"rx="2"/>
 <circle cx="9"cy="10"r="2"/>
 <line x1="15"y1="8"x2="17"y2="8"/>
 <line x1="15"y1="12"x2="17"y2="12"/>
 <line x1="7"y1="16"x2="17"y2="16"/>
 </svg>
 ),

 TrendingUp: () => (
 <svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
 <polyline points="17 6 23 6 23 12"/>
 </svg>
 ),

 PriceTag: () => (
 <svg width="20"height="20"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round">
 <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
 <line x1="7"y1="7"x2="7.01"y2="7"/>
 </svg>
 ),

 Info: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <circle cx="12"cy="12"r="10"/>
 <line x1="12"y1="16"x2="12"y2="12"/>
 <line x1="12"y1="8"x2="12.01"y2="8"/>
 </svg>
 ),

 QrCode: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <rect x="3"y="3"width="7"height="7"/>
 <rect x="14"y="3"width="7"height="7"/>
 <rect x="14"y="14"width="7"height="7"/>
 <rect x="3"y="14"width="7"height="7"/>
 </svg>
 ),

 Store: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <path d="M2 3h20"/>
 <path d="M21 3v2a4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1-4-4V3"/>
 <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/>
 <path d="M9 21v-7h6v7"/>
 </svg>
 ),

 ShoppingCart: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <circle cx="9"cy="21"r="1"/>
 <circle cx="20"cy="21"r="1"/>
 <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
 </svg>
 ),

 Trash: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <polyline points="3 6 5 6 21 6"/>
 <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
 <line x1="10"y1="11"x2="10"y2="17"/>
 <line x1="14"y1="11"x2="14"y2="17"/>
 </svg>
 ),

 FileText: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
 <polyline points="14 2 14 8 20 8"/>
 <line x1="16"y1="13"x2="8"y2="13"/>
 <line x1="16"y1="17"x2="8"y2="17"/>
 <polyline points="10 9 9 9 8 9"/>
 </svg>
 ),

 Layers: (props?: React.SVGProps<SVGSVGElement>) => (
 <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"{...props}>
 <polygon points="12 2 2 7 12 12 22 7 12 2"/>
 <polyline points="2 17 12 22 22 17"/>
 <polyline points="2 12 12 17 22 12"/>
 </svg>
 ),
};