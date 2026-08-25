export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
 if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'Falta OPENAI_API_KEY'});
 try{
  const data=req.body||{};
  const system=`Sos el analista semanal de BOOST ME, una app personal de hábitos y nutrición.
Analizá SOLO la semana cerrada que recibís, de lunes a domingo, y cuando existan datos comparables mirá también la semana anterior.
Tu trabajo no es resumir actividades. Buscá patrones útiles entre peso, grasa corporal, masa muscular, agua corporal estimada por bioimpedancia, alimentación, calorías, proteína, movimiento y ciclo registrado.
Reglas:
- No diagnostiques ni hagas afirmaciones causales médicas.
- Agua corporal y composición de balanza son estimaciones: tratarlas como contexto y tendencia.
- Si hay pocos datos, decilo claramente.
- No digas que una cosa causó otra. Usá lenguaje como coincidió, podría ser parte del contexto o miraría.
- No premies bajar más rápido de forma automática.
- Elegí UNA sola prioridad concreta para la semana nueva.
- Nada de resúmenes tipo hiciste X días. Interpretá.
- Español rioplatense natural, breve y cálido.
- No uses puntos suspensivos.
Devolvé exclusivamente JSON con title, insight, priority y confidence. confidence debe ser low, medium o high.`;
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',reasoning_effort:'low',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(data)}],response_format:{type:'json_object'}})});
  const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Error de OpenAI');const parsed=JSON.parse(body?.choices?.[0]?.message?.content||'{}');
  return res.status(200).json({title:parsed.title||'Tu semana, analizada',insight:parsed.insight||'No pude encontrar un patrón suficientemente claro.',priority:parsed.priority||'Seguí registrando esta semana.',confidence:['low','medium','high'].includes(parsed.confidence)?parsed.confidence:'medium'});
 }catch(err){console.error('analyze-week',err);return res.status(500).json({error:'No pude generar el análisis semanal'})}
}
