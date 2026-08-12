import OpenAI from "openai";
const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const schema={type:"object",additionalProperties:false,properties:{
  meal_name:{type:"string"},calories:{type:"number"},protein_g:{type:"number"},
  confidence:{type:"string",enum:["low","medium","high"]},summary:{type:"string"},
  assumptions:{type:"array",items:{type:"string"}}
},required:["meal_name","calories","protein_g","confidence","summary","assumptions"]};

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const {mealType,text,imageDataUrl}=req.body||{};
    if(!mealType)return res.status(400).json({error:"Falta el tipo de comida"});
    if(!text&&!imageDataUrl)return res.status(400).json({error:"Falta foto o descripción"});
    const content=[{type:"input_text",text:`Analizá esta comida como una estimación nutricional, no como una medición exacta.
Tipo de comida: ${mealType}.
Texto de la usuaria: ${text||"sin texto adicional"}.
Estimá calorías totales y gramos de proteína de la porción completa visible/descripta.
Usá foto y texto juntos. Si faltan aceite, salsas, cantidades o tamaño, hacé supuestos razonables y listalos.
No inventes precisión: reflejá incertidumbre en confidence. Respondé en español.`}];
    if(imageDataUrl)content.push({type:"input_image",image_url:imageDataUrl,detail:"auto"});
    const response=await openai.responses.create({
      model:"gpt-5.6",
      input:[{role:"user",content}],
      text:{format:{type:"json_schema",name:"meal_analysis",strict:true,schema}}
    });
    return res.status(200).json(JSON.parse(response.output_text));
  }catch(err){console.error(err);return res.status(500).json({error:"No pude analizar la comida"})}
}