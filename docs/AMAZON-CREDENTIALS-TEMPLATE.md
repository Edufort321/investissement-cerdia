# Template .env Amazon — à coller dans .env.local

Copie ce bloc à la fin de `C:\CERDIA\investissement-cerdia-main\.env.local`
et remplace `<TODO>` par les vraies valeurs au fur et à mesure.

```env
# ─── SP-API (Seller Central → Developer Console) ──────────────────────
AMAZON_REFRESH_TOKEN=<TODO>          # Atzr|... (self-authorize de l'app SP-API)
AMAZON_LWA_APP_ID=<TODO>             # amzn1.application-oa2-client.xxx (LWA credentials de l'app)
AMAZON_LWA_CLIENT_SECRET=<TODO>      # secret de l'app SP-API

# ─── AWS IAM (signature SigV4 pour SP-API) ────────────────────────────
AWS_ACCESS_KEY_ID=<TODO>             # AKIA... (IAM user "cerdia-sp-api")
AWS_SECRET_ACCESS_KEY=<TODO>         # secret IAM

# ─── Ads API (Sponsored Products) ─────────────────────────────────────
AMAZON_ADS_CLIENT_ID=<TODO>          # amzn1.application-oa2-client.yyy (LWA security profile Ads)
AMAZON_ADS_CLIENT_SECRET=<TODO>      # secret du security profile
AMAZON_ADS_REFRESH_TOKEN=<TODO>      # Atzr|... (OAuth one-shot, voir Section B-5)

# Rempli automatiquement par test-ads-api après le 1er run
AMAZON_ADS_PROFILE_ID=<TODO>         # numérique (le test:ads-api te dit quoi mettre)

# ─── Marketplace + Seller ID (non-secret mais requis) ─────────────────
AMAZON_MARKETPLACE_ID=A2EUQ1WTGCTBG2 # CA fixe
AMAZON_SELLER_ID=<TODO>              # Merchant Token : Seller Central → Settings → Account Info
```

Après avoir collé toutes les valeurs, lance :

```powershell
cd C:\CERDIA\investissement-cerdia-main
npm run test:sp-api    # vérifie SP-API + marketplace CA
npm run test:ads-api   # vérifie Ads + récupère AMAZON_ADS_PROFILE_ID à coller
```
