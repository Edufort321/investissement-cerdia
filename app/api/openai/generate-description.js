import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  const { productName, category, language } = req.body;
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: `Génère une description marketing attrayante en ${language === 'fr' ? 'français' : 'anglais'} pour ce produit: ${productName} (catégorie: ${category}). 
        Maximum 150 caractères, style e-commerce moderne, mets l'accent sur les bénéfices et l'émotion.`
      }],
      max_tokens: 100
    });
    
    res.json({ description: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: 'Erreur OpenAI' });
  }
}
