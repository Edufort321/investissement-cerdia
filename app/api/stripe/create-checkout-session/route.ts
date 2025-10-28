import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Check if Stripe keys are configured (not placeholder values)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
const isStripeConfigured = stripeSecretKey &&
  !stripeSecretKey.includes('your_secret_key_here') &&
  stripeSecretKey.startsWith('sk_')

// Initialize Stripe only if configured
let stripe: Stripe | null = null
if (isStripeConfigured) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-09-30.clover' as any,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { mode, userId } = await req.json()

    if (!mode || (mode !== 'single' && mode !== 'full')) {
      return NextResponse.json(
        { error: 'Invalid mode' },
        { status: 400 }
      )
    }

    // Define pricing based on mode
    const prices = {
      single: {
        amount: 500, // 5.00 CAD in cents
        name: 'Mon Voyage - Un Voyage',
        description: 'Accès à un voyage, 6 mois de validité, toutes fonctionnalités',
      },
      full: {
        amount: 1500, // 15.00 CAD in cents
        name: 'Mon Voyage - Application Complète',
        description: 'Accès illimité, toutes fonctionnalités, à vie',
      },
    }

    const priceData = prices[mode as 'single' | 'full']

    // MODE DÉMO: Si Stripe n'est pas configuré, simuler le paiement
    if (!isStripeConfigured) {
      console.log('⚠️  MODE DÉMO: Stripe non configuré, simulation du paiement')
      console.log('💡 Pour activer les vrais paiements, configurez vos clés Stripe dans .env.local')
      console.log(`   Mode: ${mode}, Prix: ${priceData.amount / 100}$ CAD`)

      // Simuler une session Stripe réussie
      const demoSessionId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Rediriger immédiatement vers la page de succès (simulation)
      const successUrl = `${req.headers.get('origin')}/mon-voyage?session_id=${demoSessionId}&mode=${mode}${userId ? `&userId=${userId}` : ''}`

      return NextResponse.json({
        sessionId: demoSessionId,
        url: successUrl,
        demo: true
      })
    }

    // MODE PRODUCTION: Créer une vraie session Stripe
    if (!stripe) {
      throw new Error('Stripe is not initialized')
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: priceData.name,
              description: priceData.description,
              images: ['https://yourdomain.com/logo-cerdia.png'], // Replace with your actual domain
            },
            unit_amount: priceData.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/mon-voyage?session_id={CHECKOUT_SESSION_ID}&mode=${mode}${userId ? `&userId=${userId}` : ''}`,
      cancel_url: `${req.headers.get('origin')}/mon-voyage?canceled=true`,
      metadata: {
        mode,
        userId: userId || '',
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
