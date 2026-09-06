export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Método no permitido'});
  if(!process.env.OPENAI_API_KEY) return res.status(500).json({error:'Falta OPENAI_API_KEY'});
  const payload=req.body||{};
  const isRecipe=payload.mode==='recipe';
  if(isRecipe&&!payload.recipe) return res.status(400).json({error:'Falta la receta'});
  if(!isRecipe&&!payload.meal) return res.status(400).json({error:'Falta la comida'});
  const system=`Sos el análisis nutricional de BOOST ME. Respondé SOLO JSON válido con {"verdict":"...","adjustment":"..."}.
Si mode es "recipe", analizá la receta completa, sus macros por porción y los objetivos enviados. Mirá la relación entre ingredientes, calorías y proteína y, solo si aporta valor, sugerí UNO o DOS cambios concretos para mejorarla sin destruir su estructura o disfrute. Si ya está bien, verdict debe decir claramente "No la tocaría" y adjustment debe ser una cadena vacía.
Si mode no es "recipe", analizá la comida en el contexto del día y de los objetivos de calorías y proteína enviados. dayTotals representa el total completo del día incluyendo la comida analizada; otherMeals son las demás comidas del día. localContext contiene la lectura y sugerencia que BOOST ME ya muestra para ese mismo día: usala como marco para mantener coherencia y no la contradigas salvo que los números del payload demuestren que es incorrecta. Si meal.recipeText está presente, usalo como la receta conocida de esa comida. Si meal.assumptions o meal.summary están presentes, usalos como contexto estimado y no como hechos exactos. Si la comida encaja bien, verdict debe decir claramente "No la tocaría" y adjustment debe ser una cadena vacía. Si conviene ajustar, proponé UNO o DOS cambios concretos y simples en adjustment.
Reglas para ambos modos: no diagnostiques ni hagas afirmaciones médicas. No juzgues moralmente alimentos ni uses aprobado/reprobado. No recomiendes compensaciones bruscas ni comer menos por haber hecho ejercicio. No inventes cantidades o ingredientes que no estén en los datos. No asumas que todo necesita más proteína. Español rioplatense, cálido, breve, útil, sin puntos suspensivos.`;
  try{
    const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',reasoning_effort:'low',response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload)}]})});
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data?.error?.message||'Error de OpenAI'});
    let out={};try{out=JSON.parse(data?.choices?.[0]?.message?.content||'{}')}catch{}
    return res.status(200).json({verdict:String(out.verdict||'No pude sacar una conclusión útil con estos datos.').slice(0,500),adjustment:String(out.adjustment||'').slice(0,500)});
  }catch(e){console.error(e);return res.status(500).json({error:isRecipe?'No pude analizar la receta':'No pude analizar la comida'});}
}
