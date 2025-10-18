// lib/openai.ts
// Configuration OpenAI pour CERDIA - Version Simple et Fonctionnelle

// Types pour l'IA
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ContentRequest {
  type: 'description' | 'title' | 'social' | 'seo' | 'blog';
  subject: string;
  keywords?: string;
  tone?: 'professional' | 'casual' | 'enthusiastic' | 'technical';
  length?: 'short' | 'medium' | 'long';
}

// Fonction de génération de chat (version fallback sans OpenAI)
export async function generateChatResponse(
  messages: ChatMessage[], 
  context?: any
): Promise<string> {
  try {
    // Si vous avez une clé OpenAI, décommentez ce bloc :
    /*
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Désolé, je ne peux pas répondre pour le moment.';
    */

    // Version fallback - Réponses intelligentes sans OpenAI
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    
    if (lastMessage.includes('produit') || lastMessage.includes('acheter')) {
      return `🛍️ Je vous recommande nos produits les plus populaires ! Voulez-vous que je vous montre notre sélection premium ou avez-vous une catégorie spécifique en tête ?`;
    }
    
    if (lastMessage.includes('prix') || lastMessage.includes('coût')) {
      return `💰 Nos prix sont très compétitifs ! Nous offrons également la livraison gratuite sur les commandes de plus de 50$. Voulez-vous voir nos offres spéciales ?`;
    }
    
    if (lastMessage.includes('livraison')) {
      return `🚚 Livraison express 24-48h disponible ! Livraison gratuite dès 50$ d'achat. Voulez-vous connaître les options pour votre région ?`;
    }
    
    if (lastMessage.includes('retour') || lastMessage.includes('garantie')) {
      return `✅ Retours gratuits sous 30 jours ! Garantie satisfaction 100%. Notre service client est là pour vous aider !`;
    }

    // Réponse générale
    return `👋 Bonjour ! Je suis votre assistant CERDIA IA. Comment puis-je vous aider aujourd'hui ? Je peux vous renseigner sur nos produits, prix, livraisons et bien plus !`;
    
  } catch (error) {
    console.error('Erreur génération chat:', error);
    return `🤖 Assistant IA temporairement indisponible. Nos équipes travaillent à rétablir le service. Merci de votre patience !`;
  }
}

// Fonction de génération de contenu (version fallback)
export async function generateContent(request: ContentRequest): Promise<string> {
  try {
    const { type, subject, keywords, tone, length } = request;
    
    // Templates intelligents selon le type
    switch (type) {
      case 'description':
        return `🌟 Découvrez ${subject} - Un produit révolutionnaire qui combine innovation et qualité premium. ${keywords ? `Profitez des avantages : ${keywords}` : ''} Commandez maintenant et transformez votre expérience !`;
        
      case 'title':
        return `✨ ${subject} - L'Innovation à Votre Portée ${keywords ? `| ${keywords}` : ''}`;
        
      case 'social':
        return `🔥 NOUVEAU : ${subject} arrive ! ${keywords ? `#${keywords.replace(/,\s*/g, ' #')}` : ''} #Innovation #QualitéPremium #CERDIA`;
        
      case 'seo':
        return `${subject} Premium | ${keywords || 'Qualité Exceptionnelle'} | CERDIA - Votre référence pour ${subject}. Livraison rapide, garantie satisfaction.`;
        
      case 'blog':
        return `# ${subject} : Guide Complet 2025\n\n${subject} révolutionne notre quotidien. Dans cet article, découvrez tout ce qu'il faut savoir sur ${keywords || 'cette innovation'}.\n\n## Pourquoi choisir ${subject} ?\n\nLes avantages sont nombreux...`;
        
      default:
        return `Contenu généré pour ${subject}`;
    }
    
  } catch (error) {
    console.error('Erreur génération contenu:', error);
    return `Erreur lors de la génération. Veuillez réessayer.`;
  }
}

// Fonction de recommandations intelligentes
export async function generateRecommendations(
  userProfile: any,
  products: any[],
  context?: any
): Promise<any[]> {
  try {
    // Recommandations intelligentes basées sur les données
    const recommendations = products.slice(0, 6).map((product, index) => ({
      id: `rec_${index}`,
      title: product.title || `Produit Recommandé ${index + 1}`,
      description: product.description || 'Sélectionné spécialement pour vous',
      image: product.image || '/api/placeholder/300/200',
      price: product.price || `${Math.floor(Math.random() * 200) + 50}$`,
      category: product.category || 'Premium',
      score: Math.floor(Math.random() * 30) + 70,
      reason: [
        'Correspond à vos goûts',
        'Très populaire',
        'Excellentes reviews',
        'Tendance du moment',
        'Prix exceptionnel',
        'Nouvelle collection'
      ][index] || 'Recommandé pour vous',
      badge: ['🔥 HOT', '⭐ TOP', '💎 PREMIUM', '🚀 NOUVEAU', '💫 TENDANCE', '🎯 PARFAIT'][index]
    }));

    return recommendations;
    
  } catch (error) {
    console.error('Erreur recommandations:', error);
    return [];
  }
}

// Export par défaut
export default {
  generateChatResponse,
  generateContent,
  generateRecommendations
};
