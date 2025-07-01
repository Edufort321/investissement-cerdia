// lib/openai.ts
import OpenAI from 'openai';

// Configuration OpenAI pour CERDIA
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types pour les fonctionnalités IA
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ContentGenerationRequest {
  type: 'description' | 'title' | 'marketing' | 'social' | 'email' | 'seo';
  subject: string;
  keywords?: string;
  tone?: 'professional' | 'casual' | 'enthusiastic' | 'educational';
  length?: 'short' | 'medium' | 'long';
  language?: 'fr' | 'en';
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  url: string;
  price: string;
  category: string;
  score: number;
  reason: string;
  emoji: string;
}

export interface SEOAnalysis {
  score: number;
  criteria: Array<{
    name: string;
    status: 'pass' | 'warning' | 'fail';
    score: number;
    description: string;
    suggestion?: string;
  }>;
}

// Fonction principale de chat IA
export async function generateChatResponse(
  messages: ChatMessage[],
  context?: {
    products?: any[];
    userProfile?: any;
    currentPage?: string;
  }
): Promise<string> {
  try {
    const systemPrompt = `Tu es CERDIA IA, un assistant e-commerce intelligent et expert en marketing digital. 
    Tu aides les utilisateurs avec:
    - Recommandations de produits personnalisées
    - Conseils marketing et SEO
    - Stratégies de vente et conversion
    - Optimisation de contenu
    - Tendances e-commerce et réseaux sociaux
    
    Contexte actuel: ${context?.currentPage || 'page produits'}
    Produits disponibles: ${context?.products?.length || 0}
    
    Réponds de manière concise, utile et engageante en français. Utilise des emojis pour rendre tes réponses plus dynamiques.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || "Désolé, je n'ai pas pu traiter votre demande.";
  } catch (error) {
    console.error('Erreur OpenAI Chat:', error);
    return "🤖 Désolé, je rencontre un problème technique. Réessayez dans quelques instants.";
  }
}

// Générateur de contenu IA
export async function generateContent(request: ContentGenerationRequest): Promise<string> {
  try {
    const prompts = {
      description: `Écris une description de produit engageante et optimisée SEO pour: ${request.subject}`,
      title: `Crée un titre accrocheur et optimisé pour: ${request.subject}`,
      marketing: `Rédige un texte marketing persuasif pour: ${request.subject}`,
      social: `Crée un post viral pour les réseaux sociaux à propos de: ${request.subject}`,
      email: `Écris un email marketing convaincant pour: ${request.subject}`,
      seo: `Génère du contenu optimisé SEO pour: ${request.subject}`
    };

    const lengthInstructions = {
      short: "En 50-100 mots maximum",
      medium: "En 100-200 mots",
      long: "En 200-400 mots"
    };

    const toneInstructions = {
      professional: "Ton professionnel et expert",
      casual: "Ton décontracté et amical", 
      enthusiastic: "Ton enthousiaste et énergique",
      educational: "Ton éducatif et informatif"
    };

    const prompt = `${prompts[request.type]}. 
    ${lengthInstructions[request.length || 'medium']}.
    ${toneInstructions[request.tone || 'professional']}.
    ${request.keywords ? `Intègre ces mots-clés: ${request.keywords}` : ''}
    ${request.language === 'en' ? 'Réponds en anglais.' : 'Réponds en français.'}
    
    Assure-toi que le contenu soit:
    - Engageant et convaincant
    - Optimisé pour la conversion
    - Adapté au e-commerce
    - Unique et créatif`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.8,
    });

    return completion.choices[0]?.message?.content || "Contenu non généré";
  } catch (error) {
    console.error('Erreur génération contenu:', error);
    return "Erreur lors de la génération du contenu.";
  }
}

// Générateur de recommandations personnalisées
export async function generateRecommendations(
  userProfile: any,
  products: any[],
  context?: { currentCategory?: string; recentViews?: any[] }
): Promise<AIRecommendation[]> {
  try {
    const prompt = `Basé sur ce profil utilisateur et ces produits, génère 5 recommandations personnalisées:
    
    Profil utilisateur: ${JSON.stringify(userProfile)}
    Catégorie actuelle: ${context?.currentCategory || 'toutes'}
    Vues récentes: ${context?.recentViews?.length || 0} produits
    
    Produits disponibles: ${products.slice(0, 20).map(p => `${p.title} - ${p.category} - ${p.price}`).join(', ')}
    
    Pour chaque recommandation, fournis:
    - Titre du produit
    - Raison de la recommandation
    - Score de pertinence (0-100)
    - Emoji approprié
    - Catégorie
    
    Format JSON uniquement.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.6,
    });

    const response = completion.choices[0]?.message?.content;
    
    // Traitement de la réponse et conversion en recommandations
    // (Ici vous pourriez parser le JSON et créer les objets AIRecommendation)
    
    return []; // Placeholder - implémentez le parsing JSON
  } catch (error) {
    console.error('Erreur recommandations IA:', error);
    return [];
  }
}

// Analyseur SEO IA
export async function analyzeSEO(content: string, url?: string): Promise<SEOAnalysis> {
  try {
    const prompt = `Analyse ce contenu SEO et donne un score détaillé:
    
    ${url ? `URL: ${url}` : ''}
    Contenu: ${content.substring(0, 2000)}
    
    Évalue ces critères:
    - Optimisation des mots-clés
    - Structure du contenu
    - Lisibilité
    - Meta descriptions
    - Titres H1-H6
    - Densité des mots-clés
    - Liens internes/externes
    - Images et alt text
    
    Donne un score global sur 100 et des suggestions d'amélioration.
    Format JSON avec structure SEOAnalysis.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    });

    // Traitement de la réponse SEO
    // (Implémentez le parsing et retournez une vraie analyse)
    
    return {
      score: 75,
      criteria: [
        {
          name: "Optimisation mots-clés",
          status: "pass",
          score: 8,
          description: "Bonne utilisation des mots-clés principaux",
          suggestion: "Ajouter des mots-clés longue traîne"
        }
      ]
    };
  } catch (error) {
    console.error('Erreur analyse SEO:', error);
    return { score: 0, criteria: [] };
  }
}

// Générateur de tendances et insights
export async function generateTrends(
  category?: string,
  timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<any[]> {
  try {
    const prompt = `Génère les tendances e-commerce actuelles pour ${category || 'toutes catégories'} sur ${timeframe}.
    
    Inclus:
    - Mots-clés tendance
    - Produits populaires
    - Stratégies marketing
    - Opportunités de contenu
    - Prédictions de croissance
    
    Format JSON avec scores de tendance.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });

    // Retourner les tendances parsées
    return [];
  } catch (error) {
    console.error('Erreur tendances IA:', error);
    return [];
  }
}

// Optimiseur de performance IA
export async function optimizePerformance(
  pageData: any,
  analyticsData: any
): Promise<any[]> {
  try {
    const prompt = `Analyse ces données de performance et suggère des optimisations:
    
    Données page: ${JSON.stringify(pageData)}
    Analytics: ${JSON.stringify(analyticsData)}
    
    Suggère des améliorations pour:
    - Vitesse de chargement
    - Taux de conversion
    - Engagement utilisateur
    - SEO
    - UX/UI
    
    Priorité les suggestions par impact/effort.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.5,
    });

    return [];
  } catch (error) {
    console.error('Erreur optimisation IA:', error);
    return [];
  }
}

// Export des fonctions principales
export {
  openai as default,
  openai
};
