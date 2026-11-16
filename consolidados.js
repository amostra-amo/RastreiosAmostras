'use strict';
const $=id=>document.getElementById(id);
const API_URL='https://rastreio-amostras-backend-production.up.railway.app/consolidados/dados';
const PALETTES={
 corporate:['#0B1F3A','#2563EB','#38BDF8','#94A3B8','#10B981','#F59E0B','#64748B']
};
let COLORS=PALETTES.corporate;
function chartInk(){return getComputedStyle(document.body).getPropertyValue('--text').trim()||'#223647'}
function chartGrid(){return getComputedStyle(document.body).getPropertyValue('--border').trim()||'#e1e8ef'}
function updateChartAppearance(){
 const ink=chartInk(), grid=chartGrid(), card=getComputedStyle(document.body).getPropertyValue('--card').trim();
 Object.values(typeof charts==='undefined'?{}:charts).forEach(ch=>{
  if(ch.options.scales){for(const s of Object.values(ch.options.scales)){if(s.ticks)s.ticks.color=ink;if(s.grid&&s.grid.display!==false)s.grid.color=grid}}
  if(ch.options.plugins?.legend?.labels)ch.options.plugins.legend.labels.color=ink;
  if(ch.options.plugins?.datalabels){ch.options.plugins.datalabels.color=ink;ch.options.plugins.datalabels.backgroundColor=ch.config.type==='doughnut'?card:undefined;}
  if(ch.options.plugins?.tooltip){ch.options.plugins.tooltip.titleColor='#FFFFFF';ch.options.plugins.tooltip.bodyColor='#FFFFFF';}
  if(ch.options.scales){for(const axis of Object.values(ch.options.scales)){if(axis.title)axis.title.color=ink;}}
  if(ch.config.type==='doughnut')ch.data.datasets[0].borderColor=card;
  ch.update('none');
 });
}
function applyAppearance(){
 const palette=PALETTES.corporate;
 COLORS=palette;
 document.documentElement.style.setProperty('--accent',palette[0]);
 document.documentElement.style.setProperty('--accent-2',palette[1]);
 document.documentElement.style.setProperty('--accent-3',palette[2]);
 document.documentElement.style.setProperty('--accent-4',palette[3]);
 document.body.dataset.theme=localStorage.getItem('consolidados-theme')||'light';
 const themeLabel=$('theme').querySelector('.side-theme-label');
 if(themeLabel)themeLabel.textContent=document.body.dataset.theme==='dark'?'☀ Modo claro':'☾ Modo escuro';
 $('theme').setAttribute('aria-pressed',String(document.body.dataset.theme==='dark'));
 if(rows.length)updateChartAppearance();
}

const TYPES=['Pilotagem','Bandeira','Cartela de cores','PDV','Brindes','Talão de vendas','Não informado'];
const MONTHS=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmt=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(Math.round(Number(n)||0));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={tipo:['AMOSTRA','Tipo','Tipo Amostra','Tipo de Amostra'],qtd:['Qtd.Original','Qtd Original','Quantidade','Qtd','Qtde'],pedido:['Pedido','Numero Pedido','Nº Pedido'],descr:['Descr','Descricao','Descrição','Descrição Produto'],marca:['Marca Atual','Marca'],vendedor:['cod_name_Vend','Vendedor','Nome Vend','Nome Vendedor'],codigo:['Cod Vend','Código Vendedor','Codigo Vendedor','Cod Vendedor','Codigo do Vendedor','Cód Vend'],rep:['cod_nome_Representante','Representante','Nome Rep'],cliente:['Nome Cliente','Cliente'],data:['Emissao Ped','Emissão Ped','Data','Data Emissao','Data Emissão','Data NF'],kg:['Peso KG','Peso (kg)','Peso','Quilos','KG','Peso Total']};
const pos={tipo:2,qtd:16,pedido:14,descr:15,marca:24,vendedor:23,codigo:22,rep:21,cliente:19,data:5,kg:29};
let rows=[],charts={},active='inicio',hasKgColumn=false;
function val(r,k){const n=aliases[k].map(norm);const header=Object.keys(r).find(x=>x!=='__pos'&&n.includes(norm(x)));return header!==undefined?r[header]:(r.__pos[pos[k]]??'')}
function weightNumber(v){
 let s=String(v??'').trim().replace(/\s/g,'').replace(/kg/ig,'').replace(/[^\d,.-]/g,'');
 if(!s)return 0;
 // A coluna AD representa kg. Pontos em valores como 0.500 são decimais,
 // não separadores de milhar. Não reutilizar o parser de quantidades.
 if(s.includes(',')&&s.includes('.')){
   if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');
   else s=s.replace(/,/g,'');
 }else if(s.includes(','))s=s.replace(',','.');
 const n=Number(s);
 return Number.isFinite(n)?n:0;
}
function number(v){let s=String(v??'').trim().replace(/\s/g,'').replace(/[^\d,.-]/g,'');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');return Number(s)||0}
function parseDate(v){if(!v)return null;const s=String(v).trim();const compact=s.match(/^(\d{4})(\d{2})(\d{2})$/);if(compact){const d=new Date(+compact[1],+compact[2]-1,+compact[3]);return d.getFullYear()===+compact[1]&&d.getMonth()===+compact[2]-1&&d.getDate()===+compact[3]?d:null}const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);if(m){const d=new Date(+m[3],+m[2]-1,+m[1]);return d.getMonth()===+m[2]-1?d:null}const d=new Date(s);return isNaN(d)?null:d}
function sector(r){const code=String(val(r,'codigo')).trim().toUpperCase().replace(/\s/g,'');if(code.startsWith('V00'))return 'Supervisão';if(code.startsWith('S50')||code.startsWith('S55'))return 'Televendas';if(code.startsWith('S62'))return 'Loja Física';if(code.startsWith('S00'))return 'Loja SP';return 'Não classificado'}
function type(r){const t=norm(val(r,'tipo'));if(!t||t==='naoinformado'||t==='naodefinido')return 'Não informado';if(t.includes('pilot'))return 'Pilotagem';if(t.includes('bandeira'))return 'Bandeira';if(t.includes('cartela')||t.includes('cor')||t.includes('mostruario'))return 'Cartela de cores';if(t==='pdv')return 'PDV';if(t.includes('brinde'))return 'Brindes';if(t.includes('talao'))return 'Talão de vendas';return 'Não informado'}
// Seleções múltiplas: OR dentro de cada filtro e AND entre filtros.
const selections={metrica:new Set(),setor:new Set(),ano:new Set(),mes:new Set()};
function mode(){const s=selections.metrica;return s.size===1?[...s][0]:'original'}
function rowMatchesItems(r){const s=selections.metrica;if(!s.size||s.has('original'))return true;return (s.has('pendente')&&pendenciaOperacional(r))||(s.has('faturada')&&number(r.quantidade_faturada_sd2)>0)}
function filtered(){return rows.filter(r=>{const d=parseDate(val(r,'data'));return rowMatchesItems(r)&&(!selections.setor.size||selections.setor.has(sector(r)))&&(!selections.ano.size||(d&&selections.ano.has(String(d.getFullYear()))))&&(!selections.mes.size||(d&&selections.mes.has(String(d.getMonth()+1))))})}
function updateMultiLabel(id){const root=document.querySelector(`[data-filter="${id}"]`),chosen=selections[id],btn=$(id+'-trigger');if(!root||!btn)return;const labels=[...root.querySelectorAll('input[type="checkbox"]')].filter(c=>chosen.has(c.value)).map(c=>c.nextElementSibling.textContent);btn.textContent=labels.length===0?(id==='metrica'?'Todos os itens':'Todos'):labels.length<=2?labels.join(', '):`${labels.length} selecionados`;root.querySelectorAll('input[type="checkbox"]').forEach(c=>c.checked=chosen.has(c.value));}
function fill(id,values){const root=document.querySelector(`[data-filter="${id}"]`);if(!root)return;const choices=$(id+'-choices');const unique=[...new Set(values.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));selections[id]=new Set([...selections[id]].filter(v=>unique.includes(v)));choices.replaceChildren();unique.forEach(v=>{const label=document.createElement('label');label.className='multi-option';const input=document.createElement('input');input.type='checkbox';input.value=v;const span=document.createElement('span');span.textContent=id==='mes'?MONTHS[Number(v)-1]:v;label.append(input,span);choices.append(label)});updateMultiLabel(id)}
function setupMulti(){document.querySelectorAll('.multi-filter').forEach(root=>{const id=root.dataset.filter,btn=$(id+'-trigger'),panel=$(id+'-options');btn.addEventListener('click',()=>{const open=panel.hidden;document.querySelectorAll('.multi-panel').forEach(p=>p.hidden=true);document.querySelectorAll('.multi-trigger').forEach(b=>b.setAttribute('aria-expanded','false'));panel.hidden=!open;btn.setAttribute('aria-expanded',String(open))});root.addEventListener('change',e=>{if(e.target.type!=='checkbox')return;const v=e.target.value;if(e.target.checked){selections[id].add(v)}else selections[id].delete(v);updateMultiLabel(id);render()});root.querySelector('.multi-all').addEventListener('click',()=>{selections[id].clear();updateMultiLabel(id);render()})});document.addEventListener('click',e=>{if(e.target.closest('.multi-filter'))return;document.querySelectorAll('.multi-panel').forEach(p=>p.hidden=true);document.querySelectorAll('.multi-trigger').forEach(b=>b.setAttribute('aria-expanded','false'))});document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.multi-panel').forEach(p=>p.hidden=true);document.querySelectorAll('.multi-trigger').forEach(b=>b.setAttribute('aria-expanded','false'))}})}
function csvParse(text){const first=(text.split(/\r?\n/)[0]||'');const sep=[';',',','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];const out=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===sep&&!quoted){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))out.push(row);row=[];field=''}else field+=c}row.push(field);if(row.some(v=>v.trim()))out.push(row);return out}
function load(content,label){const parsed=csvParse(content.replace(/^\uFEFF/,''));const heads=parsed.shift()||[];if(!heads.length||!parsed.length)throw Error('CSV vazio.');if(heads.length<25)throw Error('O CSV não contém as colunas esperadas da planilha de rastreio.');hasKgColumn=heads.length>29||heads.some(h=>aliases.kg.map(norm).includes(norm(h)));rows=parsed.map(a=>({...Object.fromEntries(heads.map((h,i)=>[h.trim(),a[i]??''])),__pos:a}));fill('ano',rows.map(r=>parseDate(val(r,'data'))?.getFullYear()?.toString()));fill('mes',rows.map(r=>parseDate(val(r,'data'))?String(parseDate(val(r,'data')).getMonth()+1):''));$('status').textContent=`${fmt(rows.length)} registros • ${label}`;$('notice').style.display='none';render()}
function destroyCharts(){Object.values(charts).forEach(c=>c.destroy());charts={}}
function makeChart(id,config){if(typeof Chart==='undefined'){showNotice('A biblioteca de gráficos não carregou. Verifique a conexão com a internet.');return}if(charts[id])charts[id].destroy();charts[id]=new Chart($(id),config)}
const basePlugins={legend:{position:'bottom',labels:{color:chartInk(),usePointStyle:true,padding:17,font:{size:11}}},tooltip:{backgroundColor:'#092634',titleColor:'#FFFFFF',bodyColor:'#FFFFFF',padding:11}};
function pluginLabels(options){return typeof ChartDataLabels==='undefined'?{}:{datalabels:options}}
function showNotice(message){$('notice').textContent=message;$('notice').style.display='block'}
function originalInteira(r){return Math.ceil(Math.max(0,number(val(r,'qtd'))))}
function selectedQuantity(r){const m=mode();if(m==='pendente')return pendenciaOperacional(r)?Math.ceil(Math.max(0,number(r.quantidade_pendente))):0;if(m==='faturada')return Math.ceil(Math.max(0,number(r.quantidade_faturada)));return originalInteira(r)}
function group(data,key,metric='qtd'){const map=new Map();data.forEach(r=>{const k=key(r)||'Não informado';map.set(k,(map.get(k)||0)+(metric==='count'?1:selectedQuantity(r)))});return [...map].sort((a,b)=>b[1]-a[1])}
function table(id,headers,data){const el=$(id);el.replaceChildren();const thead=document.createElement('thead'),tr=document.createElement('tr');headers.forEach(h=>{const th=document.createElement('th');th.textContent=h;tr.append(th)});thead.append(tr);el.append(thead);const tbody=document.createElement('tbody');data.slice(0,3000).forEach(items=>{const tr=document.createElement('tr');items.forEach(item=>{const td=document.createElement('td');td.textContent=item;tr.append(td)});tbody.append(tr)});el.append(tbody)}
function pendenciaOperacional(r){const venda=number(r.quantidade_venda),faturada=number(r.quantidade_faturada_sd2);return venda>0.000001&&faturada+Math.max(0.000001,venda*0.00001)<venda}
function orderKey(r){const pedido=String(val(r,'pedido')??'').trim();return pedido?String(r.filial||'').trim()+':'+pedido:null}
// Marca da vendedora: vem do Protheus (SA3.A3_END -> 4K / LUARA).
function sellerBrand(r){const m=String(r.marca_vendedor||'').trim();return m&&m!=='Não identificada'?m:'Não identificada'}
// Vendedor no formato "V00100 - BEATRIZ POLITO" (só o código/nome quando faltar um deles).
function sellerLabel(r){const code=String(r.codigo||'').trim().toUpperCase();const name=String(val(r,'vendedor')||'').trim();if(!code)return name||'—';if(!name||name.toUpperCase()===code)return code;return code+' - '+name}
function summary(data,keys){const m=new Map();data.forEach(r=>{const labels=keys.map(k=>k==='setor'?sector(r):k==='tipo'?type(r):k==='marca_vendedor'?sellerBrand(r):k==='vendedor_codigo'?sellerLabel(r):val(r,k)||'—');const key=JSON.stringify(labels);const o=m.get(key)||{labels,q:0,orders:new Set(),records:0};o.q+=selectedQuantity(r);const order=orderKey(r);if(order)o.orders.add(order);o.records++;m.set(key,o)});return [...m.values()].sort((a,b)=>b.q-a.q)}
function renderTables(d,total){const g=summary(d,['marca_vendedor','setor','vendedor_codigo']);table('tParcial1',['Marca','Setor','Vendedor','Pedidos distintos','Quantidade','% Quantidade'],g.map(x=>[...x.labels,fmt(x.orders.size),fmt(x.q),total?fmt(100*x.q/total)+'%':'0%']));table('tParcial2',['Descrição','Registros','Quantidade','% Quantidade'],summary(d,['descr']).map(x=>[...x.labels,fmt(x.records),fmt(x.q),total?fmt(100*x.q/total)+'%':'0%']));table('tCompleto',['Marca','Setor','Vendedor','Descrição','Tipo','Representante','Cliente','Pedidos distintos','Quantidade'],summary(d,['marca','setor','vendedor','descr','tipo','rep','cliente']).map(x=>[...x.labels,fmt(x.orders.size),fmt(x.q)]))}
function selectedKg(r){
 const unidade=String(r.unidade_medida||'').trim().toUpperCase();
 if(unidade!=='KG')return 0;
 const metrica=mode();
 if(metrica==='faturada')return weightNumber(r.peso_faturado_kg);
 if(metrica==='pendente')return pendenciaOperacional(r)?weightNumber(r.peso_pendente_kg):0;
 return weightNumber(val(r,'kg'));
}

// V11: mini gráficos com dados reais do mesmo conjunto filtrado nos cards.
function renderSparklines(data){
 const months=[...new Set(data.map(r=>{const d=parseDate(val(r,'data'));return d?d.getFullYear()*12+d.getMonth():null}).filter(v=>v!==null))].sort((a,b)=>a-b);
 const last=months.slice(-7);
 const series=[
  {id:'kQtd',color:'#2563EB',value:r=>selectedQuantity(r)},
  {id:'kKg',color:'#F59E0B',value:r=>selectedKg(r)},
  {id:'kPed',color:'#38BDF8',value:null},
  {id:'kCli',color:'#10B981',value:null}
 ];
 const buckets=new Map(last.map(m=>[m,[]]));
 data.forEach(r=>{const d=parseDate(val(r,'data'));if(!d)return;const k=d.getFullYear()*12+d.getMonth();if(buckets.has(k))buckets.get(k).push(r)});
 const ns='http://www.w3.org/2000/svg';
 series.forEach(item=>{
  const svg=$('spark-'+item.id),trend=$('trend-'+item.id);if(!svg||!trend)return;
  svg.replaceChildren();
  const values=last.map(k=>{
   const list=buckets.get(k)||[];
   if(item.value)return list.reduce((sum,r)=>sum+item.value(r),0);
   return new Set(list.filter(r=>mode()==='pendente'?pendenciaOperacional(r):mode()==='faturada'?number(r.quantidade_faturada)>0:true).map(item.id==='kCli'?clientKey:orderKey).filter(Boolean)).size;
  });
  if(!values.length){trend.textContent='Sem histórico';return}
  const low=Math.min(...values),high=Math.max(...values),range=high-low||1;
  const coords=values.map((v,i)=>[4+(i/Math.max(1,values.length-1))*112,41-((v-low)/range)*29]);
  // Curva cúbica contínua: controles horizontais dão transições suaves sem cantos.
  let path=`M ${coords[0][0].toFixed(2)} ${coords[0][1].toFixed(2)}`;
  for(let i=1;i<coords.length;i++){
   const [x0,y0]=coords[i-1],[x1,y1]=coords[i],mid=(x0+x1)/2;
   path+=` C ${mid.toFixed(2)} ${y0.toFixed(2)}, ${mid.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  const uid='sparkgrad-'+item.id;
  const defs=document.createElementNS(ns,'defs');
  const strokeGradient=document.createElementNS(ns,'linearGradient');
  strokeGradient.setAttribute('id',uid+'-line');strokeGradient.setAttribute('x1','0%');strokeGradient.setAttribute('x2','100%');
  [['0%','1'],['68%','.8'],['100%','.22']].forEach(([offset,opacity])=>{
   const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset);
   stop.setAttribute('stop-color',item.color);stop.setAttribute('stop-opacity',opacity);strokeGradient.append(stop);
  });
  const fillGradient=document.createElementNS(ns,'linearGradient');
  fillGradient.setAttribute('id',uid+'-fill');fillGradient.setAttribute('x1','0%');fillGradient.setAttribute('x2','0%');fillGradient.setAttribute('y1','0%');fillGradient.setAttribute('y2','100%');
  [['0%','.13'],['100%','0']].forEach(([offset,opacity])=>{
   const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset);
   stop.setAttribute('stop-color',item.color);stop.setAttribute('stop-opacity',opacity);fillGradient.append(stop);
  });
  defs.append(strokeGradient,fillGradient);svg.append(defs);
  const area=document.createElementNS(ns,'path');
  area.setAttribute('d',path+` L ${coords[coords.length-1][0].toFixed(2)} 49 L ${coords[0][0].toFixed(2)} 49 Z`);
  area.setAttribute('fill',`url(#${uid}-fill)`);svg.append(area);
  const line=document.createElementNS(ns,'path');line.setAttribute('d',path);
  line.setAttribute('fill','none');line.setAttribute('stroke',`url(#${uid}-line)`);
  line.setAttribute('stroke-width','2.8');line.setAttribute('stroke-linecap','round');
  line.setAttribute('stroke-linejoin','round');svg.append(line);
  const prev=values.length>1?values[values.length-2]:null;
  if(prev===null){trend.textContent='Último mês';return}
  const delta=values[values.length-1]-prev;
  trend.textContent=(delta>0?'↗ +':delta<0?'↘ −':'→ ')+fmt(Math.abs(delta))+' vs. mês anterior';
 });
}

function clientKey(r){const code=String(r.codigo_cliente||'').trim().toUpperCase();if(code)return 'COD:'+code;const name=norm(val(r,'cliente'));return name?'NOME:'+name:null}
function render(){const d=filtered(),total=d.reduce((s,r)=>s+selectedQuantity(r),0),kg=d.reduce((s,r)=>s+selectedKg(r),0),metrica=mode(),orders=new Set(d.filter(r=>metrica==='pendente'?pendenciaOperacional(r):metrica==='faturada'?number(r.quantidade_faturada)>0:true).map(orderKey).filter(Boolean));$('kQtd').textContent=fmt(total);const kgTitle=document.querySelector('#kKg')?.closest('.kpi')?.querySelector('.kpi-top span');if(kgTitle)kgTitle.textContent=metrica==='pendente'?'Peso pendente':metrica==='faturada'?'Peso faturado':'Peso solicitado';$('kKg').textContent=hasKgColumn?fmt(kg)+' Kg':'—';$('kPed').textContent=fmt(orders.size);const clients=new Set(d.filter(r=>metrica==='pendente'?pendenciaOperacional(r):metrica==='faturada'?number(r.quantidade_faturada)>0:true).map(clientKey).filter(Boolean));$('kCli').textContent=fmt(clients.size);$('kQtdSub').textContent=({original:'Quantidade de todos os itens',faturada:'Quantidade faturada',pendente:'Quantidade pendente'})[mode()];$('kKgSub').textContent=hasKgColumn?({original:'Peso solicitado (KG)',faturada:'Peso faturado (SD2, KG)',pendente:'Peso pendente (KG)'})[mode()]:'Peso não disponível';$('kPedSub').textContent=({original:'Todos os pedidos distintos',faturada:'Pedidos com faturamento',pendente:'Pedidos com pendências'})[metrica];renderSparklines(d);if(!rows.length){showNotice('Carregando os dados do Protheus…');return}if(!d.length)showNotice('Nenhum registro encontrado para os filtros selecionados.');else $('notice').style.display='none';if(active!=='inicio'){destroyCharts();renderTables(d,total);return}if(typeof Chart==='undefined'){showNotice('Não foi possível carregar o Chart.js.');return}if(typeof ChartDataLabels!=='undefined'&&!Chart.registry.plugins.get('datalabels'))Chart.register(ChartDataLabels);
const allSums=TYPES.map(t=>d.filter(r=>type(r)===t).reduce((s,r)=>s+selectedQuantity(r),0));
// Só exibe nos gráficos os tipos com quantidade > 0 (ex.: PDV, Talão de vendas e
// Não informado zerados somem). A cor de cada tipo continua a mesma (índice original).
const visibleTypes=TYPES.map((t,i)=>({t,i,v:allSums[i]})).filter(x=>x.v>0);
const sums=visibleTypes.map(x=>x.v);
const months=[...new Set(d.map(r=>{const x=parseDate(val(r,'data'));return x?`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`:null}).filter(Boolean))].sort();const monthly=visibleTypes.map(({t,i})=>({label:t,data:months.map(m=>d.reduce((s,r)=>{const x=parseDate(val(r,'data'));return s+(x&&`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`===m&&type(r)===t?selectedQuantity(r):0)},0)),backgroundColor:COLORS[i],borderColor:COLORS[i],borderWidth:2,borderRadius:4,maxBarThickness:34}));
makeChart('line',{type:'bar',data:{labels:months.map(m=>MONTHS[+m.slice(5)-1]+'/'+m.slice(2)),datasets:monthly},options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},scales:{x:{grid:{display:false},ticks:{color:chartInk()}},y:{beginAtZero:true,grid:{color:chartGrid()},ticks:{color:chartInk()}}},plugins:{...basePlugins,...pluginLabels({anchor:'end',align:'end',color:chartInk(),font:{weight:'bold',size:10},formatter:v=>v?fmt(v):''})}}});
makeChart('pie',{type:'doughnut',data:{labels:visibleTypes.map(x=>x.t),datasets:[{data:sums,backgroundColor:visibleTypes.map(x=>COLORS[x.i%COLORS.length]),borderColor:getComputedStyle(document.body).getPropertyValue('--card').trim(),borderWidth:4,hoverOffset:7}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{...basePlugins,...pluginLabels({color:chartInk(),backgroundColor:getComputedStyle(document.body).getPropertyValue('--card').trim(),borderRadius:5,padding:5,font:{weight:'bold',size:11},formatter:v=>v?fmt(v):''})}}});
const descriptions=group(d,r=>val(r,'descr')).filter(x=>x[1]>0).slice(0,15);
const descLabels=descriptions.map(x=>x[0]);
$('descriptionWrap').style.height=Math.min(810,Math.max(340,descriptions.length*42+85))+'px';
makeChart('col',{
 type:'bar',
 data:{labels:descLabels,datasets:[{
  label:'Quantidade',data:descriptions.map(x=>x[1]),
  backgroundColor:ctx=>{
   const area=ctx.chart.chartArea;
   if(!area)return '#2563EB';
   const gradient=ctx.chart.ctx.createLinearGradient(area.left,0,area.right,0);
   gradient.addColorStop(0,document.body.dataset.theme==='dark'?'#60A5FA':'#1D4ED8');gradient.addColorStop(1,document.body.dataset.theme==='dark'?'#BAE6FD':'#38BDF8');return gradient;
  },hoverBackgroundColor:document.body.dataset.theme==='dark'?'#93C5FD':'#0B1F3A',borderRadius:7,borderSkipped:false,barPercentage:.72,categoryPercentage:.83,maxBarThickness:24
 }]},
 options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
  interaction:{mode:'nearest',intersect:true},layout:{padding:{left:6,right:46,top:8,bottom:8}},
  scales:{
   x:{beginAtZero:true,grid:{color:chartGrid(),drawTicks:false},border:{display:false},ticks:{color:chartInk(),padding:10,precision:0,callback:v=>fmt(v)}},
   y:{grid:{display:false},border:{display:false},ticks:{color:chartInk(),autoSkip:false,padding:12,font:{size:11,weight:'500'},callback:function(v){const label=this.getLabelForValue(v);return label.length>44?label.slice(0,41)+'…':label}}}
  },plugins:{legend:{display:false},tooltip:{...basePlugins.tooltip,mode:'nearest',intersect:true,displayColors:false,callbacks:{title:items=>descLabels[items[0].dataIndex]||'',label:item=>'Quantidade: '+fmt(item.parsed.x)}},
   ...pluginLabels({anchor:'end',align:'end',offset:5,clip:false,color:chartInk(),font:{weight:'bold',size:11},formatter:v=>v?fmt(v):''})}
 }
});}

$('menu').onclick=()=>{$('sidebar').classList.add('open');$('shade').classList.add('open')};$('shade').onclick=()=>{$('sidebar').classList.remove('open');$('shade').classList.remove('open')};$('side-close').onclick=()=>{$('sidebar').classList.remove('open');$('shade').classList.remove('open')};$('logout').onclick=()=>{localStorage.clear();sessionStorage.clear();location.href='index.html'};
document.querySelectorAll('#tabs button').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('#tabs button,.page').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');active=btn.dataset.page;$(active).classList.add('selected');render()});
setupMulti();
// Estado de carregamento: mostra spinner sobre gráficos/tabelas e skeleton nos KPIs
// enquanto a consulta ao Protheus está em andamento.
function setLoading(on){
 document.body.classList.toggle('is-loading',!!on);
 const m=document.querySelector('main');if(m)m.setAttribute('aria-busy',on?'true':'false');
}
async function refresh(forcar=false){
 setLoading(true);
 $('refresh').disabled=true;$('status').textContent='Consultando Protheus…';
 try{
  const token=sessionStorage.getItem('app_session_token')||localStorage.getItem('app_session_token')||'';
  if(!token)throw Error('Faça login novamente para acessar o Consolidado.');
  const headers=token?{'Authorization':'Bearer '+token}:{};
  const res=await fetch(API_URL+'?_'+Date.now()+(forcar?'&forcar=true':''),{cache:'no-store',headers});
  if(!res.ok){let detail='HTTP '+res.status;try{const err=await res.json();detail=err.detail||detail}catch{}throw Error(detail)}
  const payload=await res.json();
  if(!Array.isArray(payload.items))throw Error('Formato de resposta inválido.');if(payload.items.length&&!Object.prototype.hasOwnProperty.call(payload.items[0],'peso_faturado_kg'))throw Error('O Agent ainda não retornou os campos de peso faturado. Reinicie o Agent e aguarde expirar o cache do Railway.');if(payload.items.length&&!Object.prototype.hasOwnProperty.call(payload.items[0],'situacao_faturamento'))throw Error('Backend ainda não retornou dados de faturamento. Atualize o Agent e aguarde expirar o cache de 15 minutos.');
  rows=payload.items.map(r=>({
   filial:r.filial||'',tipo:r.tipo||'Não informado',qtd:r.quantidade_original??0,
   pedido:r.pedido||'',descr:r.descricao||'',marca:r.marca||'Não identificada',
   vendedor:r.vendedor||r.codigo_vendedor||'Não identificado',codigo:r.codigo_vendedor||'',classificacao_vendedor:r.classificacao_vendedor||'',marca_vendedor:r.marca_vendedor||'Não identificada',canal_vendedor:r.canal_vendedor||'',
   rep:r.representante||r.codigo_representante||'',cliente:r.cliente||r.codigo_cliente||'',codigo_cliente:r.codigo_cliente||'',
   data:r.data||'',item:r.item||'',kg:r.peso_kg??0,unidade_medida:r.unidade_medida||'',peso_faturado_kg:r.peso_faturado_kg??0,peso_pendente_kg:r.peso_pendente_kg??0,quantidade_venda:r.quantidade_venda??0,quantidade_faturada_sd2:r.quantidade_faturada_sd2??0,quantidade_faturada:r.quantidade_faturada??0,quantidade_pendente:r.quantidade_pendente??0,situacao_faturamento:r.situacao_faturamento||'Pendente',tes:r.tes||'',notas_fiscais:r.notas_fiscais||[]
  }));
  hasKgColumn=true;
  Object.assign(aliases,{tipo:['tipo'],qtd:['qtd'],pedido:['pedido'],descr:['descr'],marca:['marca'],vendedor:['vendedor'],codigo:['codigo'],rep:['rep'],cliente:['cliente'],data:['data'],kg:['kg']});
  fill('ano',rows.map(r=>parseDate(r.data)?.getFullYear()?.toString()));
  fill('mes',rows.map(r=>parseDate(r.data)?String(parseDate(r.data).getMonth()+1):''));
  $('status').textContent=`${fmt(rows.length)} itens • atualizado ${new Date(payload.atualizado_em||Date.now()).toLocaleTimeString('pt-BR')}${payload.atualizando?' • atualização em andamento':payload.cache?' • cache':''}`;
  $('notice').style.display='none';render();
 }catch(e){$('status').textContent='Falha na consulta';showNotice('Não foi possível carregar os dados do Protheus: '+e.message);console.error(e)}
 finally{$('refresh').disabled=false;setLoading(false)}
}
$('refresh').onclick=()=>refresh(true);
$('theme').addEventListener('click',()=>{localStorage.setItem('consolidados-theme',document.body.dataset.theme==='dark'?'light':'dark');applyAppearance();if(rows.length)render()});
applyAppearance();
setLoading(true);
window.addEventListener('load',()=>refresh(false));
