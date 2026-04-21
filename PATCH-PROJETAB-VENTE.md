# 🔧 PATCH À APPLIQUER - ProjetTab pour champs vente

## Modifications restantes pour ProjetTab.tsx

### 1. Mettre à jour l'état initial `formData`
Ajouter dans `useState<PropertyFormData>` (ligne ~72):
```typescript
sale_date: '',
sale_price: 0,
sale_currency: 'USD',
buyer_name: '',
sale_notes: ''
```

### 2. Mettre à jour `handleEdit` (ligne ~162)
Ajouter après `completion_date`:
```typescript
sale_date: property.sale_date ? property.sale_date.split('T')[0] : '',
sale_price: property.sale_price || 0,
sale_currency: property.sale_currency || 'USD',
buyer_name: property.buyer_name || '',
sale_notes: property.sale_notes || ''
```

### 3. Mettre à jour `resetForm` (ligne ~196)
Ajouter après `completion_date: ''`:
```typescript
sale_date: '',
sale_price: 0,
sale_currency: 'USD',
buyer_name: '',
sale_notes: ''
```

### 4. Ajouter import PropertyFinancialSummary (ligne ~1)
```typescript
import PropertyFinancialSummary from './PropertyFinancialSummary'
```

### 5. Ajouter état pour modal Bilan (ligne ~52)
```typescript
const [showFinancialSummaryPropertyId, setShowFinancialSummaryPropertyId] = useState<string | null>(null)
```

### 6. Ajouter statut 'vendu' dans le select (ligne ~366)
```typescript
<option value="vendu">Vendu</option>
```

### 7. Ajouter section vente dans formulaire (après Date de livraison, ligne ~397)
```typescript
{/* Section Vente (si statut = vendu) */}
{formData.status === 'vendu' && (
  <div className="col-span-2 border-t border-gray-200 pt-6">
    <h4 className="text-sm font-semibold text-gray-900 mb-4">💸 Informations de Vente</h4>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date de vente
        </label>
        <input
          type="date"
          value={formData.sale_date}
          onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prix de vente
        </label>
        <input
          type="number"
          value={formData.sale_price}
          onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
          placeholder="Ex: 300000"
          min="0"
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Devise de vente
        </label>
        <select
          value={formData.sale_currency}
          onChange={(e) => setFormData({ ...formData, sale_currency: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
        >
          <option value="USD">USD ($)</option>
          <option value="CAD">CAD ($)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom de l'acheteur (optionnel)
        </label>
        <input
          type="text"
          value={formData.buyer_name}
          onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
          placeholder="Ex: Jean Dupont"
        />
      </div>

      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes sur la vente (optionnel)
        </label>
        <textarea
          value={formData.sale_notes}
          onChange={(e) => setFormData({ ...formData, sale_notes: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
          placeholder="Ex: Vendu via agent immobilier ABC, commission 5%"
          rows={2}
        />
      </div>
    </div>
  </div>
)}
```

### 8. Ajouter bouton "Bilan Financier" (ligne ~1456, à côté du bouton Performance)
```typescript
<button
  onClick={() => setShowFinancialSummaryPropertyId(showFinancialSummaryPropertyId === property.id ? null : property.id)}
  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
>
  <DollarSign size={16} />
  Bilan Financier
</button>
```

### 9. Ajouter modal Bilan Financier (après modal Performance ROI, ligne ~1531)
```typescript
{/* Financial Summary Modal */}
{showFinancialSummaryPropertyId && (() => {
  const property = properties.find(p => p.id === showFinancialSummaryPropertyId)
  if (!property) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-[95vw] sm:max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Bilan Financier</h3>
            <p className="text-sm text-gray-600 mt-1">{property?.name}</p>
          </div>
          <button
            onClick={() => setShowFinancialSummaryPropertyId(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {property && (
            <PropertyFinancialSummary
              propertyId={property.id}
              propertyName={property.name}
              totalCost={property.total_cost}
              currency={property.currency || 'USD'}
              status={property.status}
              reservationDate={property.reservation_date}
              completionDate={property.completion_date}
              saleDate={property.sale_date}
              salePrice={property.sale_price}
              saleCurrency={property.sale_currency}
              transactions={transactions}
              onOpenPerformanceROI={() => {
                setShowFinancialSummaryPropertyId(null)
                setShowPerformancePropertyId(property.id)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
})()}
```

## Résumé des changements

### Fichiers créés:
- ✅ `supabase/migrations-investisseur/106-add-property-sale-fields.sql`
- ✅ `components/PropertyFinancialSummary.tsx`
- ✅ `ANALYSE-SYSTEME-PROPRIETÉS-COMPLET.md`

### Fichiers à modifier:
- ⏳ `components/ProjetTab.tsx` (9 modifications ci-dessus)

### Ce que ça apporte:
1. **Champs vente** dans formulaire édition (date, prix, devise, acheteur, notes)
2. **Bouton "Bilan Financier"** pour chaque propriété
3. **Modal avec bilan complet**: Revenus + Dépenses + Performance
4. **Si vendu**: Affiche gain/perte net et ROI total
5. **Interconnexion**: Bouton vers "Analyse ROI détaillée"
6. **Source unique**: Tout calculé depuis transactions

### Workflow utilisateur final:
```
1. Gestion Projets → Cliquer sur propriété
2. Voir 2 boutons:
   - [📊 Bilan Financier] → Vue globale simple
   - [📈 Performance & ROI] → Vue détaillée avec projections
3. Bilan affiche: Investissement, Revenus, Dépenses, Performance
4. Clic sur "Analyse ROI détaillée" → Ouvre Performance
5. Si vendu: Affiche gain/perte net et ROI total
```

## Prochaines étapes:
1. Appliquer les 9 modifications ci-dessus dans ProjetTab.tsx
2. Commit et push
3. Exécuter migration 106 sur Supabase
4. Tester le workflow complet
