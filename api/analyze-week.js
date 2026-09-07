function validPrimaryProgress(p){
 return !!(p&&p.basis==='monday_to_monday'&&Number.isFinite(+p.startWeight)&&Number.isFinite(+p.endWeight)&&Number.isFinite(+p.lossKg)&&Number.isFinite(+p.lossPct)&&['down','up','stable'].includes(p.direction));
}
function primaryProgressSentence(p){
 const kg=Math.abs(+p.lossKg).toFixed(2),pct=Math.abs(+p.lossPct).toFixed(2);
 if(p.direction==='down')return `De lunes a lunes bajaste ${kg} kg (${pct}%).`;
 if(p.direction==='up')return `De lunes a lunes subiste ${kg} kg (${pct}%).`;
 return 'De lunes a lunes tu peso se mantuvo igual.';
}
function stripWeightNarrative(text){
 return String(text||'').split(/(?<=[.!?])\s+/).filter(s=>!/(\bpeso\b|\bkg\b|\bkilos?\b|\bgramos?\b|lunes a lunes|\bbajaste\b|\bsubiste\b)/i.test(s)).join(' ').trim();
}

export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
 if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'Falta OPENAI_API_KEY'});
 try{
  const data=req.body||{},hasPrimary=validPrimaryProgress(data.primaryProgress);
  const system=`Sos el analista semanal de BOOST ME, una app personal de hábitos y nutrición.
Analizá la semana cerrada que recibís, de lunes a domingo, y cuando existan datos comparables mirá también la semana anterior. Para el cambio de peso principal, primaryProgress puede usar el lunes inmediatamente posterior como punto de cierre de la comparación lunes a lunes; esa es la única excepción al rango lunes-domingo.
Tu trabajo no es resumir actividades. Buscá patrones útiles entre peso, grasa corporal, masa muscular, agua corporal estimada por bioimpedancia, alimentación, calorías, proteína, movimiento y ciclo registrado.
Reglas:
- No diagnostiques ni hagas afirmaciones causales médicas.
- Agua corporal y composición de balanza son estimaciones: tratarlas como contexto y tendencia.
- Si hay pocos datos, decilo claramente.
- No digas que una cosa causó otra. Usá lenguaje como coincidió, podría ser parte del contexto o miraría.
- No premies bajar más rápido de forma automática.
- Si primaryProgress existe, es la métrica PRINCIPAL de cambio de peso: compara lunes a lunes. En ese caso NO escribas ninguna frase sobre peso, kilos, dirección del peso ni promedios de peso dentro de insight, title ni priority: el servidor agregará la frase de peso de forma determinística. Concentrate en interpretar grasa, músculo, agua, alimentación, proteína, movimiento y ciclo.
- Cuando primaryProgress existe, weight y previousWeight se omiten a propósito: no inventes ni reconstruyas promedios semanales.
- Si primaryProgress no existe y weight/previousWeight sí existen, podés usar esos promedios con lenguaje explícito de "promedio", sin confundirlos con el descenso lunes a lunes.
- Elegí UNA sola prioridad concreta para la semana nueva.
- Nada de resúmenes tipo hiciste X días. Interpretá.
- Español rioplatense natural, breve y cálido.
- No uses puntos suspensivos.
Devolvé exclusivamente JSON con title, insight, priority y confidence. confidence debe ser low, medium o high.`;
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',reasoning_effort:'low',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(data)}],response_format:{type:'json_object'}})});
  const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Error de OpenAI');const parsed=JSON.parse(body?.choices?.[0]?.message?.content||'{}');
  let title=parsed.title||'Tu semana, analizada',insight=parsed.insight||'No pude encontrar un patrón suficientemente claro.',priority=parsed.priority||'Seguí registrando esta semana.';
  if(hasPrimary){const rest=stripWeightNarrative(insight);insight=primaryProgressSentence(data.primaryProgress)+(rest?' '+rest:'');if(/(\bpeso\b|\bkg\b|\bkilos?\b|\bgramos?\b|lunes a lunes|\bbajaste\b|\bsubiste\b)/i.test(title))title='Tu semana, analizada';if(/(\bpeso\b|\bkg\b|\bkilos?\b|\bgramos?\b|lunes a lunes|\bbajaste\b|\bsubiste\b)/i.test(priority))priority='Esta semana: sostené registros simples y consistentes para seguir viendo la tendencia con contexto.'}
  return res.status(200).json({title,insight,priority,confidence:['low','medium','high'].includes(parsed.confidence)?parsed.confidence:'medium'});
 }catch(err){console.error('analyze-week',err);return res.status(500).json({error:'No pude generar el análisis semanal'})}
}
