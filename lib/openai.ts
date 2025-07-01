// lib/openai.ts - Version simple sans dépendance OpenAI
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// Fonction de chat simulée (sans OpenAI pour éviter les erreurs)
export async function generateChatResponse(
  messages: ChatMessage[],
  context?: any
): Promise<string> {
  // Simulation d'une réponse IA
  const responses = [
    "🤖 Salut ! Je suis votre assistant IA CERDIA. Comment puis-je vous aider aujourd'hui ?",
    "💡 Excellente question ! Basé sur vos préférences, je peux vous recommander plusieurs produits intéressants.",
    "📊 D'après mes analyses, cette catégorie de produits connaît une croissance de 15% ce mois-ci !",
    "🎯 Je peux vous aider à optimiser vos descriptions de produits pour augmenter vos conversions.",
    "🚀 Voulez-vous que je génère du contenu marketing personnalisé pour vos produits ?"
  ];
  
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
  
  if (lastMessage.includes('bonjour') || lastMessage.includes('salut')) {
    return responses[0];
  } else if (lastMessage.includes('recommand') || lastMessage.includes('conseil')) {
    return responses[1];
  } else if (lastMessage.includes('statistic') || lastMessage.includes('analyse')) {
    return responses[2];
  } else if (lastMessage.includes('contenu') || lastMessage.includes('marketing')) {
    return responses[4];
  } else {
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// Fonction de génération de contenu simulée
export async function generateContent(request: any): Promise<string> {
  const { type, subject, keywords } = request;
  
  const templates = {
    description: `Découvrez ${subject} - une innovation révolutionnaire. ${keywords ? `Avec ${keywords}, ` : ''}ce produit transforme votre expérience quotidienne.`,
    title: `🚀 ${subject} - Innovation Premium`,
    marketing: `🔥 OFFRE SPÉCIALE ! ${subject} maintenant disponible. ${keywords ? `${keywords} inclus.` : ''} Ne ratez pas cette opportunité !`,
    social: `✨ ${subject} est arrivé ! ${keywords ? `#${keywords.replace(/,/g, ' #')}` : ''} #Innovation #CERDIA`,
    email: `Bonjour ! Découvrez notre nouveauté : ${subject}. ${keywords ? `${keywords} pour une expérience unique.` : ''} Commandez maintenant !`
  };
  
  return templates[type as keyof typeof templates] || templates.description;
}

export default {
  generateChatResponse,
  generateContent
};
