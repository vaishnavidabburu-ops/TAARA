import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import {MapContainer,TileLayer,CircleMarker,Popup} from "react-leaflet";
import {AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,LineChart,Line} from "recharts";
import {Activity,AlertTriangle,ArrowUpRight,Bell,ChevronRight,CloudSun,Download,Flame,Gauge,HeartPulse,LayoutDashboard,MapPinned,Menu,Monitor,RefreshCw,Send,Shield,SlidersHorizontal,Users,Wind,Wifi,CheckCircle2,Clock3,Hospital,Settings,FileText,LogOut,Play,Pause,Search,Navigation,Radio,SunMedium} from "lucide-react";

type Role="State Authority"|"District Officer"|"Mandal Officer";
type Risk="LOW"|"MODERATE"|"HIGH"|"CRITICAL";
type City={name:string;lat:number;lon:number;temp:number;humidity:number;wind:number;uv:number;feels:number;population:number;vulnerability:number;};

const cities:City[]=[
{name:"Vijayawada",lat:16.5062,lon:80.648,population:1048240,vulnerability:78,temp:34.2,humidity:67,wind:18,uv:9,feels:39},
{name:"Guntur",lat:16.3067,lon:80.4365,population:743354,vulnerability:72,temp:35.1,humidity:61,wind:16,uv:10,feels:39},
{name:"Eluru",lat:16.7107,lon:81.0952,population:214414,vulnerability:68,temp:33.6,humidity:73,wind:14,uv:9,feels:39},
{name:"Kakinada",lat:16.9891,lon:82.2475,population:443028,vulnerability:64,temp:32.8,humidity:78,wind:20,uv:8,feels:39},
{name:"Visakhapatnam",lat:17.6868,lon:83.2185,population:1728128,vulnerability:70,temp:31.9,humidity:76,wind:22,uv:8,feels:38},
{name:"Srikakulam",lat:18.2949,lon:83.8938,population:137944, vulnerability:61,temp:33.0,humidity:71,wind:17,uv:9,feels:38},
{name:"West Godavari",lat:16.9174,lon:81.3399,population:1790000,vulnerability:66,temp:33.4,humidity:75,wind:15,uv:9,feels:39}
];

function riskFrom(temp:number,humidity:number,uv:number,v:number):number{
  const heat=Math.min(100,Math.max(0,(temp-27)*9));
  const humidityRisk=Math.min(100,humidity*0.9);
  const uvRisk=Math.min(100,uv*10);
  return Math.round(heat*.48+humidityRisk*.20+uvRisk*.12+v*.20);
}
const cat=(n:number):Risk=>n>=76?"CRITICAL":n>=51?"HIGH":n>=26?"MODERATE":"LOW";
const riskClass=(r:Risk)=>r==="CRITICAL"?"critical":r==="HIGH"?"high":r==="MODERATE"?"moderate":"low";

async function liveWeather(c:City){
  try{
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,uv_index,pressure_msl&timezone=Asia%2FKolkata`;
    const j=await fetch(u).then(x=>x.json());
    const x=j.current;
    return {...c,temp:x.temperature_2m,humidity:x.relative_humidity_2m,feels:x.apparent_temperature,wind:x.wind_speed_10m,uv:x.uv_index};
  }catch{return c;}
}

const nav=[["Dashboard",LayoutDashboard],["Live Monitoring",Monitor],["Risk Prediction",Gauge],["Alerts",Bell],["Affected Areas",MapPinned],["Resources",Shield],["Reports",FileText],["Settings",Settings]] as const;

function App(){
 const [logged,setLogged]=useState(false),[role,setRole]=useState<Role>("District Officer"),[page,setPage]=useState("Dashboard"),[mobile,setMobile]=useState(false);
 const [selected,setSelected]=useState(cities[0]),[live,setLive]=useState(false),[loading,setLoading]=useState(false),[sim,setSim]=useState(false),[simStep,setSimStep]=useState(0);
 const [citiesState,setCitiesState]=useState(cities),[alerts,setAlerts]=useState<any[]>([]),[incidents,setIncidents]=useState<any[]>([]);
 const [resources,setResources]=useState({teams:12,ambulances:18,medical:72,shelters:27});
 const score=useMemo(()=>riskFrom(selected.temp,selected.humidity,selected.uv,selected.vulnerability),[selected]);
 const risk=cat(score);

 async function refresh(){
   setLoading(true); const next=await Promise.all(citiesState.map(liveWeather)); setCitiesState(next);
   setSelected(next.find(x=>x.name===selected.name)||next[0]); setLoading(false);
 }
 useEffect(()=>{refresh()},[]);
 useEffect(()=>{if(!live)return; const t=setInterval(refresh,15000); return()=>clearInterval(t)},[live]);
 useEffect(()=>{if(!sim)return; const t=setInterval(()=>setSimStep(s=>s>=5?5:s+1),1300); return()=>clearInterval(t)},[sim]);

 const simCity=useMemo(()=>{
   if(!sim)return selected;
   const factor=simStep/5;
   return {...selected,temp:selected.temp+4.8*factor,humidity:Math.min(96,selected.humidity+18*factor),uv:Math.min(12,selected.uv+1.5*factor),feels:selected.feels+6*factor};
 },[selected,sim,simStep]);
 const simScore=riskFrom(simCity.temp,simCity.humidity,simCity.uv,simCity.vulnerability);
 const effectiveScore=sim?simScore:score, effectiveRisk=cat(effectiveScore);

 useEffect(()=>{if(sim && simStep>=4 && effectiveScore>=51)setAlerts(a=>a.some(x=>x.scenario)?a:[{id:"THR-26083-001",location:selected.name,type:"Extreme Heat / Thermal Stress",severity:effectiveRisk,confidence:89,action:"Activate heat-health response and public advisory",status:"Active",time:new Date().toLocaleTimeString(),scenario:true},...a])},[sim,simStep,effectiveScore,effectiveRisk,selected.name]);

 if(!logged)return <Login role={role} setRole={setRole} onLogin={()=>setLogged(true)}/>;

 const common={citiesState,selected,setSelected,page,setPage,loading,refresh,live,setLive,sim,setSim,simStep,setSimStep,score:effectiveScore,risk:effectiveRisk,alerts,setAlerts,resources,setResources,incidents,setIncidents,simCity};

 return <div className="app">
  <aside className={`sidebar ${mobile?"open":""}`}>
   <div className="brand"><div className="brandIcon"><SunMedium size={23}/></div><div><b>TAARA</b><span>Heat Intelligence</span></div></div>
   <div className="demoFlag">DEMO • LIVE WEATHER</div>
   <div className="nav">{nav.map(([n,I])=><button className={page===n?"navItem active":"navItem"} onClick={()=>{setPage(n);setMobile(false)}} key={n}><I size={18}/><span>{n}</span>{page===n&&<ChevronRight size={15}/>}</button>)}</div>
   <div className="sideBottom"><div className="system"><span className="dot"></span><div><b>System online</b><small>Live source connected</small></div></div><button className="logout" onClick={()=>setLogged(false)}><LogOut size={16}/> Logout</button></div>
  </aside>
  {mobile&&<div className="overlay" onClick={()=>setMobile(false)}/>}
  <main className="main">
   <header className="topbar"><button className="iconBtn mobileBtn" onClick={()=>setMobile(true)}><Menu/></button><div><div className="crumb">SIH 2026 / PS 26083</div><h2>{page}</h2></div><div className="topActions"><span className="livePill"><span className="dot"></span> LIVE WEATHER</span><button className="iconBtn" onClick={refresh}><RefreshCw className={loading?"spin":""} size={18}/></button><div className="avatar">DO</div></div></header>
   <div className="content">
    <div className="notice"><Radio size={16}/><b>DEMO / LIVE WEATHER:</b> Current weather is fetched from Open-Meteo. Risk, vulnerability, alerts and resource actions are demonstration decision-support data.</div>
    {page==="Dashboard"&&<Dashboard {...common}/>}
    {page==="Live Monitoring"&&<Monitoring {...common}/>}
    {page==="Risk Prediction"&&<Prediction {...common}/>}
    {page==="Alerts"&&<AlertsPage {...common}/>}
    {page==="Affected Areas"&&<Areas {...common}/>}
    {page==="Resources"&&<Resources {...common}/>}
    {page==="Reports"&&<Reports {...common}/>}
    {page==="Settings"&&<SettingsPage {...common}/>}
   </div>
  </main>
 </div>
}

function Login({role,setRole,onLogin}:{role:Role,setRole:(r:Role)=>void,onLogin:()=>void}){
 return <div className="login"><div className="loginPanel"><div className="loginLogo"><div className="brandIcon big"><SunMedium/></div><div><b>TAARA</b><span>Thermal Stress Intelligence</span></div></div><div className="loginTitle"><h1>Predict heat risk.<br/><em>Protect communities.</em></h1><p>Intelligent heatwave early warning and human thermal-stress monitoring for disaster-management authorities.</p></div><div className="loginCard"><label>Officer ID</label><input defaultValue="DEMO-OFFICER-001"/><label>Password</label><input type="password" defaultValue="demo123"/><label>Role</label><select value={role} onChange={e=>setRole(e.target.value as Role)}><option>State Authority</option><option>District Officer</option><option>Mandal Officer</option></select><button className="primary full" onClick={onLogin}>Launch Command Center <ArrowUpRight size={18}/></button><button className="ghost full" onClick={onLogin}>Use Demo Account</button><small>Demo authentication • no real credentials are transmitted</small></div></div><div className="loginVisual"><div className="visualGrid"></div><div className="visualCopy"><span>SIH 2026 • PROBLEM STATEMENT 26083</span><h2>Monitor → Predict → Alert → Respond</h2><p>One command center for heatwave risk, thermal stress and rapid response.</p></div></div></div>
}

function Header({title,sub}:{title:string,sub:string}){return <div className="pageHead"><div><h1>{title}</h1><p>{sub}</p></div></div>}

function Kpi({icon:Icon,label,value,sub,kind}:{icon:any,label:string,value:any,sub:string,kind?:Risk}){return <div className="kpi"><div className="kpiTop"><div className="kpiIcon"><Icon size={19}/></div>{kind&&<span className={`badge ${riskClass(kind)}`}>{kind}</span>}</div><div className="kpiValue">{value}</div><div className="kpiLabel">{label}</div><small>{sub}</small></div>}

function Dashboard(p:any){
 const {selected,setSelected,citiesState,score,risk,live,setLive,sim,setSim,simStep,setSimStep,alerts,setAlerts,resources}=p;
 const hist=Array.from({length:12},(_,i)=>({h:`${i+8}:00`,temp:Math.round((selected.temp-2+i*.22)*10)/10,stress:Math.round((score-8+i*1.2))}));
 return <><Header title="Heat Risk Command Center" sub="A decision-support view for monitoring environmental heat and human thermal stress across Andhra Pradesh."/>
 <div className="scenarioBar"><div><strong>5-minute judge demo</strong><span>Run the Heat Escalation Scenario to see the complete chain react.</span></div><button className="scenarioBtn" onClick={()=>{setSim(!sim);setSimStep(sim?0:1)}}>{sim?<Pause size={17}/>:<Play size={17}/>} {sim?"Stop":"Run"} Heat Escalation</button></div>
 <div className="kpis">
  <Kpi icon={Flame} label="Current Risk Level" value={risk} sub={`${score}/100 thermal stress score`} kind={risk}/>
  <Kpi icon={MapPinned} label="Areas Under Watch" value="8" sub="district / urban zones"/>
  <Kpi icon={Bell} label="Active Alerts" value={alerts.length+2} sub="demo alert registry"/>
  <Kpi icon={Users} label="People Potentially Affected" value={risk==="CRITICAL"?"42,680":"24,850"} sub="vulnerability-weighted estimate"/>
  <Kpi icon={Shield} label="Emergency Readiness" value={`${Math.round((resources.teams/20)*100)}%`} sub="resource availability"/>
 </div>
 <div className="grid2">
  <div className="panel"><div className="panelHead"><div><h3>Thermal stress trend</h3><span>Last 12 hours • {selected.name}</span></div><button className="textBtn" onClick={()=>setLive(!live)}>{live?<Pause size={15}/>:<Play size={15}/>} {live?"Live updates on":"Start live updates"}</button></div><div className="chart"><ResponsiveContainer width="100%" height={260}><AreaChart data={hist}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="h"/><YAxis/><Tooltip/><Area type="monotone" dataKey="stress" fill="var(--accentSoft)" stroke="var(--accent)" fillOpacity={1}/></AreaChart></ResponsiveContainer></div></div>
  <div className="panel"><div className="panelHead"><div><h3>Current conditions</h3><span>Live source • updated just now</span></div><span className="sourceTag"><Wifi size={13}/> Open-Meteo</span></div><div className="conditionGrid"><Metric icon={Flame} label="Temperature" value={`${selected.temp.toFixed(1)} °C`}/><Metric icon={HeartPulse} label="Feels like" value={`${selected.feels.toFixed(1)} °C`}/><Metric icon={CloudSun} label="Humidity" value={`${selected.humidity}%`}/><Metric icon={Wind} label="Wind" value={`${selected.wind.toFixed(0)} km/h`}/><Metric icon={SunMedium} label="UV Index" value={selected.uv.toFixed(1)}/><Metric icon={Activity} label="Pressure" value="Live"/><Metric icon={Gauge} label="Thermal score" value={`${score}/100`}/><Metric icon={Users} label="Vulnerability" value={`${selected.vulnerability}/100`}/></div></div>
 </div>
 <div className="gridMap"><div className="panel mapPanel"><div className="panelHead"><div><h3>Heat risk map</h3><span>Andhra Pradesh monitoring view</span></div><div className="legend"><span><i className="dot lowDot"/>Low</span><span><i className="dot modDot"/>Moderate</span><span><i className="dot highDot"/>High</span><span><i className="dot critDot"/>Critical</span></div></div><HeatMap cities={citiesState} selected={selected} setSelected={setSelected}/></div><div className="panel"><div className="panelHead"><div><h3>Data sources</h3><span>Architecture-ready connectors</span></div></div><Source name="Current weather API" status="Connected" live/><Source name="Government weather data" status="Ready"/><Source name="IoT heat sensors" status="Simulated"/><Source name="Satellite / remote sensing" status="Simulated"/><Source name="Historical heat datasets" status="Available"/><Source name="Officer reports" status="Available"/><div className="sync"><Clock3 size={15}/> Last sync: {new Date().toLocaleTimeString()}</div></div></div>
 <div className="panel demoFlow"><div className="panelHead"><div><h3>Heat escalation demo</h3><span>Only heat / thermal-stress simulation</span></div><span className="stepCount">{simStep}/5</span></div><div className="steps">{["Environmental change","Risk detection","Prediction","Alert generation","Response recommendation"].map((x,i)=><div className={simStep>i?"step done":"step"} key={x}><span>{i+1}</span><b>{x}</b></div>)}</div></div>
 </>
}

function Metric({icon:Icon,label,value}:{icon:any,label:string,value:string}){return <div className="metric"><Icon size={18}/><div><small>{label}</small><b>{value}</b></div></div>}
function Source({name,status,live}:{name:string,status:string,live?:boolean}){return <div className="source"><div><span className={`dot ${live?"liveDot":""}`}></span>{name}</div><b>{status}</b></div>}

function HeatMap({cities:cs,selected,setSelected}:{cities:City[],selected:City,setSelected:(c:City)=>void}){
 return <div className="mapWrap"><MapContainer center={[16.9,81.8]} zoom={6} scrollWheelZoom={true} style={{height:"420px",width:"100%"}}><TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{cs.map(c=>{const r=cat(riskFrom(c.temp,c.humidity,c.uv,c.vulnerability));const color=r==="CRITICAL"?"#dc2626":r==="HIGH"?"#ea580c":r==="MODERATE"?"#ca8a04":"#16a34a";return <CircleMarker key={c.name} center={[c.lat,c.lon]} radius={10} pathOptions={{color,fillColor:color,fillOpacity:.8}} eventHandlers={{click:()=>setSelected(c)}}><Popup><b>{c.name}</b><br/>Heat risk: {r}<br/>Temperature: {c.temp.toFixed(1)} °C<br/>Feels like: {c.feels.toFixed(1)} °C<br/>Humidity: {c.humidity}%<br/>UV: {c.uv}<br/>Population at risk: {Math.round(c.population*c.vulnerability/100).toLocaleString()}</Popup></CircleMarker>})}</MapContainer></div>
}

function Monitoring(p:any){
 const {citiesState,selected,setSelected,refresh,loading,live,setLive,simCity,score}=p;
 const [range,setRange]=useState("24h");
 const data=Array.from({length:24},(_,i)=>({h:`${(new Date().getHours()-23+i+24)%24}:00`,temperature:+(selected.temp-3+Math.sin(i/3)*1.7).toFixed(1),humidity:Math.round(selected.humidity+Math.cos(i/4)*5),stress:Math.round(score-12+Math.sin(i/5)*7)}));
 return <><Header title="Live Environment Monitoring" sub="Current weather is retrieved from a live public weather API. Simulated sensors are clearly labelled."/><div className="toolbar"><div className="selectWrap"><Navigation size={16}/><select value={selected.name} onChange={e=>setSelected(citiesState.find(x=>x.name===e.target.value)!)}>{citiesState.map(c=><option key={c.name}>{c.name}</option>)}</select></div><button className={live?"secondary activeBtn":"secondary"} onClick={()=>setLive(!live)}>{live?<Pause/>:<Play/>}{live?"Live polling ON":"Start live polling"}</button><button className="secondary" onClick={refresh}><RefreshCw className={loading?"spin":""}/> Refresh now</button></div><div className="readingHero"><div><span className="eyebrow">CURRENT HEAT CONDITIONS</span><div className="bigTemp">{selected.temp.toFixed(1)}°<small>C</small></div><p>Feels like <b>{selected.feels.toFixed(1)}°C</b> • {selected.humidity}% humidity • UV {selected.uv.toFixed(1)}</p></div><div className={`riskBox ${riskClass(cat(score))}`}><span>Thermal stress risk</span><b>{cat(score)}</b><strong>{score}/100</strong></div></div><div className="readings">{[["Temperature",`${selected.temp.toFixed(1)} °C`,Flame],["Humidity",`${selected.humidity}%`,CloudSun],["Feels Like",`${selected.feels.toFixed(1)} °C`,HeartPulse],["Wind",`${selected.wind.toFixed(0)} km/h`,Wind],["UV Index",selected.uv.toFixed(1),SunMedium],["Pressure","Live",Gauge],["Heat Exposure","Elevated",Activity],["Vulnerability",`${selected.vulnerability}/100`,Users]].map(([a,b,I]:any)=><Metric key={a} icon={I} label={a} value={b}/>)}</div><div className="panel"><div className="panelHead"><div><h3>24-hour thermal stress trend</h3><span>Demonstration series derived from current conditions</span></div><div className="seg"><button className={range==="24h"?"on":""} onClick={()=>setRange("24h")}>24h</button><button className={range==="12h"?"on":""} onClick={()=>setRange("12h")}>12h</button></div></div><div className="chart"><ResponsiveContainer width="100%" height={330}><LineChart data={range==="12h"?data.slice(12):data}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="h"/><YAxis/><Tooltip/><Line type="monotone" dataKey="temperature" stroke="var(--accent)" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="stress" stroke="var(--warning)" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></div><div className="panel"><div className="panelHead"><div><h3>Data source status</h3><span>Prototype connector registry</span></div></div><Source name="Open-Meteo current weather" status="LIVE" live/><Source name="IoT thermal sensors" status="SIMULATED"/><Source name="Government weather feed" status="READY"/><Source name="Historical vulnerability dataset" status="DEMO"/></div></>
}

function Prediction(p:any){
 const {selected,score,risk,simCity}=p; const predicted=Math.min(100,Math.round(score+12)); const conf=Math.min(95,76+Math.round((selected.vulnerability+selected.uv)/15));
 const d=[{t:"Now",v:score},{t:"+1h",v:Math.min(100,score+3)},{t:"+2h",v:Math.min(100,score+6)},{t:"+3h",v:Math.min(100,score+9)},{t:"+6h",v:predicted},{t:"+12h",v:Math.min(100,predicted+4)}];
 return <><Header title="AI Risk Prediction" sub="A transparent demo prediction layer for heatwave and human thermal-stress escalation."/><div className="predictionHero"><div><span className="eyebrow">SIMULATED AI PREDICTION</span><h2>{selected.name}</h2><p>Prediction window: next 6 hours</p></div><div className="predScore"><span>Predicted risk</span><b>{predicted}<small>/100</small></b><em className={`badge ${riskClass(cat(predicted))}`}>{cat(predicted)}</em></div><div className="confidence"><span>Confidence</span><b>{conf}%</b><div className="bar"><i style={{width:`${conf}%`}}/></div></div></div><div className="grid2"><div className="panel"><div className="panelHead"><div><h3>Risk trajectory</h3><span>Current → projected</span></div></div><div className="chart"><ResponsiveContainer width="100%" height={310}><LineChart data={d}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="t"/><YAxis domain={[0,100]}/><Tooltip/><Line dataKey="v" stroke="var(--accent)" strokeWidth={3}/></LineChart></ResponsiveContainer></div></div><div className="panel factors"><div className="panelHead"><div><h3>Why is this area at risk?</h3><span>Model factors • transparent demo logic</span></div></div><Factor text="High temperature / apparent temperature" value={Math.round(Math.min(100,(simCity.temp-27)*9))}/><Factor text="Humidity contribution" value={Math.round(simCity.humidity*.9)}/><Factor text="UV exposure" value={Math.round(simCity.uv*10)}/><Factor text="Population vulnerability" value={selected.vulnerability}/><div className="formula"><b>Demo risk formula</b><p>Heat × 48% + Humidity × 20% + UV × 12% + Vulnerability × 20%</p></div></div></div><div className="warningNote"><AlertTriangle/><div><b>Important limitation</b><p>This is a simulated AI/demo prediction model for SIH demonstration. It is not a scientifically validated public-health forecast and must not be treated as official guidance.</p></div></div></>
}
function Factor({text,value}:{text:string,value:number}){return <div className="factor"><div><span>{text}</span><b>{value}/100</b></div><div className="bar"><i style={{width:`${Math.min(100,value)}%`}}/></div></div>}

function AlertsPage(p:any){
 const {alerts,setAlerts,score,risk,selected}=p;
 const base=[{id:"ALR-26083-004",location:selected.name,type:"Heatwave / Thermal Stress",severity:risk,confidence:87,action:"Issue heat-health advisory; activate local monitoring",status:"Active",time:new Date().toLocaleTimeString()}];
 const list=[...base,...alerts];
 const action=(id:string,act:string)=>setAlerts(list.map(a=>a.id===id?{...a,status:act==="Acknowledge"?"Acknowledged":act==="Escalate"?"Escalated":"Dispatched"}:a));
 return <><Header title="Early Warning & Alerts" sub="Threshold-based heat alerts with simulated dissemination and officer actions."/><div className="alertBanner"><div className="alertIcon"><AlertTriangle/></div><div><b>{risk==="CRITICAL"?"CRITICAL":"ACTIVE"} HEAT RISK</b><span>{selected.name} • thermal stress score {score}/100</span></div><button className="primary" onClick={()=>setAlerts([{id:`ALR-${Date.now().toString().slice(-6)}`,location:selected.name,type:"Extreme Heat / Thermal Stress",severity:risk,confidence:90,action:"Send heat-health advisory and check vulnerable populations",status:"Dispatched",time:new Date().toLocaleTimeString()},...alerts])}><Send size={16}/> Send Alert</button></div><div className="panel"><div className="panelHead"><div><h3>Active alert registry</h3><span>Demo actions • no SMS/email is actually sent</span></div></div>{list.map(a=><div className="alertRow" key={a.id}><div className={`severity ${riskClass(a.severity)}`}>{a.severity}</div><div className="alertMain"><b>{a.id} • {a.type}</b><span>{a.location} • Detected {a.time}</span><p>{a.action}</p></div><div className="confidence"><small>Confidence</small><b>{a.confidence}%</b></div><span className="status">{a.status}</span><div className="rowBtns"><button onClick={()=>action(a.id,"Acknowledge")}>Acknowledge</button><button onClick={()=>action(a.id,"Escalate")}>Escalate</button><button onClick={()=>action(a.id,"Send")}>Send Alert</button></div></div>)}</div><div className="grid2"><div className="panel"><div className="panelHead"><h3>Alert distribution</h3></div><Source name="Officer dashboard" status="Sent" live/><Source name="Mobile app" status="Simulated"/><Source name="SMS gateway" status="Simulated"/><Source name="Email" status="Simulated"/><Source name="Public warning board" status="Simulated"/></div><div className="panel"><div className="panelHead"><h3>Alert history</h3></div><div className="timeline"><div><b>Now</b><span>Heat-risk assessment refreshed</span></div><div><b>08:42</b><span>Heat-health warning generated</span></div><div><b>07:15</b><span>Elevated thermal stress detected</span></div></div></div></div></>
}

function Areas(p:any){
 const {citiesState,selected,setSelected}=p; const [q,setQ]=useState(""); const [filter,setFilter]=useState("ALL");
 const rows=citiesState.filter(c=>c.name.toLowerCase().includes(q.toLowerCase())).filter(c=>filter==="ALL"||cat(riskFrom(c.temp,c.humidity,c.uv,c.vulnerability))===filter);
 return <><Header title="Affected & Vulnerable Areas" sub="Prioritize heat-response actions using current conditions and vulnerability indicators."/><div className="toolbar"><div className="search"><Search size={16}/><input placeholder="Search district / location" value={q} onChange={e=>setQ(e.target.value)}/></div><select className="filter" value={filter} onChange={e=>setFilter(e.target.value)}><option>ALL</option><option>CRITICAL</option><option>HIGH</option><option>MODERATE</option><option>LOW</option></select></div><div className="panel tablePanel"><table><thead><tr><th>Location</th><th>Risk</th><th>Temperature</th><th>Population</th><th>Population at risk</th><th>Vulnerability</th><th>Officer status</th></tr></thead><tbody>{rows.map(c=>{const r=cat(riskFrom(c.temp,c.humidity,c.uv,c.vulnerability));return <tr onClick={()=>setSelected(c)} key={c.name}><td><b>{c.name}</b><small>Andhra Pradesh</small></td><td><span className={`badge ${riskClass(r)}`}>{r}</span></td><td>{c.temp.toFixed(1)}°C</td><td>{c.population.toLocaleString()}</td><td>{Math.round(c.population*c.vulnerability/100).toLocaleString()}</td><td>{c.vulnerability}/100</td><td><span className="statusDot"><i/>Monitoring</span></td></tr>})}</tbody></table></div></>
}

function Resources(p:any){
 const {resources,setResources}=p;
 const deploy=(key:"teams"|"ambulances"|"medical"|"shelters")=>setResources({...resources,[key]:Math.max(0,resources[key]-1)});
 const items=[["Rescue Teams","teams",resources.teams,"12 available",Shield],["Ambulances","ambulances",resources.ambulances,"18 available",HeartPulse],["Medical Kits","medical",resources.medical,"72 units",Hospital],["Shelters","shelters",resources.shelters,"27 ready",Users]] as any[];
 return <><Header title="Emergency Resource Management" sub="Track readiness and demonstrate response deployment after a heat alert."/><div className="resourceGrid">{items.map(([n,k,v,sub,I]:any)=><div className="resourceCard" key={k}><div className="resourceIcon"><I/></div><div><span>{n}</span><b>{v}</b><small>{sub}</small></div><button onClick={()=>deploy(k)}>Deploy <ArrowUpRight size={15}/></button></div>)}</div><div className="panel"><div className="panelHead"><div><h3>Recommended response</h3><span>Triggered by current thermal stress risk</span></div></div><div className={`response ${riskClass(cat(p.score))}`}><AlertTriangle/><div><b>{p.risk} heat-risk response</b><ol><li>Alert district and mandal officials</li><li>Activate heat-health monitoring and vulnerable-population checks</li><li>Prepare cooling centres and drinking-water points</li><li>Check ambulance / medical-kit readiness</li><li>Issue public heat-safety advisory if threshold is exceeded</li><li>Continue live monitoring and reassess every 15 minutes</li></ol></div></div></div></>
}

function Reports(p:any){
 const {selected,score,risk,alerts,resources}=p; const generate=()=>{const w=window.open("","_blank");if(!w)return;w.document.write(`<html><head><title>TAARA Heat Risk Report</title><style>body{font-family:Arial;padding:40px;line-height:1.5}h1{color:#0f766e}.box{border:1px solid #ddd;padding:18px;margin:12px 0;border-radius:10px}</style></head><body><h1>TAARA — Heat Risk Report</h1><p>Generated: ${new Date().toLocaleString()}</p><div class="box"><b>Location:</b> ${selected.name}<br/><b>Risk:</b> ${risk} (${score}/100)<br/><b>Temperature:</b> ${selected.temp.toFixed(1)} °C<br/><b>Feels like:</b> ${selected.feels.toFixed(1)} °C<br/><b>Humidity:</b> ${selected.humidity}%<br/><b>UV:</b> ${selected.uv}</div><div class="box"><b>Active alerts:</b> ${alerts.length+2}<br/><b>People potentially affected:</b> ${Math.round(selected.population*selected.vulnerability/100).toLocaleString()}<br/><b>Rescue teams available:</b> ${resources.teams}</div><div class="box"><b>Recommended actions</b><ul><li>Monitor vulnerable groups</li><li>Maintain cooling-centre readiness</li><li>Issue heat-health communication as required</li><li>Reassess thermal stress continuously</li></ul></div><p><i>DEMO REPORT — weather values sourced live; risk and response outputs are demonstration decision-support.</i></p><script>window.print()</script></body></html>`);w.document.close()}; return <><Header title="Reports & Situation Briefs" sub="Generate a printable decision-support report for the current monitoring context."/><div className="reportCards">{[["Daily Heat Risk Report","Current environmental conditions, risk score and recommendations."],["District Risk Report","Location-level heat vulnerability and active alerts."],["Alert Report","Alert registry, confidence and response actions."],["Resource Report","Readiness and deployment status."]].map(([a,b])=><div className="reportCard" key={a}><FileText/><h3>{a}</h3><p>{b}</p><button className="secondary" onClick={generate}><Download size={16}/> Generate / Print PDF</button></div>)}</div></>
}
function SettingsPage(){return <><Header title="Settings & Data Governance" sub="Prototype configuration and transparency controls."/><div className="grid2"><div className="panel"><div className="panelHead"><h3>Data mode</h3></div><Source name="Live weather" status="ENABLED" live/><Source name="Heat simulation" status="ENABLED"/><Source name="Flood simulation" status="DISABLED"/><Source name="Real SMS / email" status="DISABLED"/><Source name="Official government alerts" status="NOT CONNECTED"/></div><div className="panel"><div className="panelHead"><h3>Backend-ready service contracts</h3></div>{["/api/weather","/api/sensors","/api/risk/:district","/api/predictions/:district","/api/alerts","/api/incidents","/api/resources","/api/reports"].map(x=><div className="apiLine" key={x}><code>{x}</code><span>MOCK / CONNECTOR READY</span></div>)}</div></div><div className="warningNote"><Shield/><div><b>Data transparency</b><p>TAARA distinguishes live weather from simulated decision-support inputs. Any production deployment should connect authenticated government datasets, validated heat-health thresholds, approved alert channels and a scientifically validated prediction model.</p></div></div></>}
createRoot(document.getElementById("root")!).render(<App/>);