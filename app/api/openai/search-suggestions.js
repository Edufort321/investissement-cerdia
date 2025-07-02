import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  const { query, products, language } = req.body;
  
  try {
    const productList = products.map(p => `${p.name} (${p.categories.join(', ')})`).join('\n');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: `Basé sur cette recherche "${query}" et cette liste de produits:
        ${productList}
        
        Suggère 3-5 termes de recherche similaires en ${language === 'fr' ? 'français' : 'anglais'} qui pourraient intéresser l'utilisateur. 
        Retourne seulement les termes, séparés par des virgules.`
      }],
      max_tokens: 80
    });
    
    const suggestions = completion.choices[0].message.content.split(',').map(s => s.trim());
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Erreur OpenAI' });
  }
}
