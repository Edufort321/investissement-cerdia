import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  const { products, language } = req.body;
  
  try {
    const productData = products.map(p => 
      `${p.name}: ${p.views} vues, ${p.likes} likes, note ${p.rating}/5, catégories: ${p.categories.join(', ')}`
    ).join('\n');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: `Analyse ces données de produits e-commerce en ${language === 'fr' ? 'français' : 'anglais'}:
        ${productData}
        
        Fournis 3-4 insights marketing concrets et actionables pour améliorer les performances.`
      }],
      max_tokens: 200
    });
    
    res.json({ insights: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: 'Erreur OpenAI' });
  }
}
