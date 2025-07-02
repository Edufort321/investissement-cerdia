// SECTION 2/2 : Ajoutez ceci après la ligne 525 (après </header>)

{/* Suggestions IA */}
{aiSuggestions.length > 0 && (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-4`}>
    <div className={`rounded-xl border-2 p-4 ${
      darkMode ? 'bg-gray-800 border-gray-600' : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-lg">🤖</span>
        <span className={`font-medium ${darkMode ? 'text-white' : 'text-blue-800'}`}>
          Suggestions IA
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {aiSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSearchWithAI(suggestion)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              darkMode 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                : 'bg-white text-blue-700 hover:bg-blue-100'
            } border-2 ${darkMode ? 'border-gray-600' : 'border-blue-200'}`}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  </div>
)}

{/* Panneau IA Admin */}
{showAiPanel && passwordEntered && (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8`}>
    <div className={`rounded-2xl border-2 p-6 ${
      darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
    } shadow-xl`}>
      <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        🤖 Assistant IA
      </h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Générer description produit
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Nom du produit..."
              className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  generateProductDescription(e.currentTarget.value);
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="Nom du produit..."]') as HTMLInputElement;
                if (input?.value) generateProductDescription(input.value);
              }}
              disabled={aiLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? '⏳' : '✨'}
            </button>
          </div>
        </div>
        {aiGeneratedDesc && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Description générée
            </label>
            <div className={`p-4 rounded-lg border-2 ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {aiGeneratedDesc}
              </p>
              <button
                onClick={() => setNewProduct(prev => ({ ...prev, description: aiGeneratedDesc }))}
                className="mt-2 px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
              >
                Utiliser cette description
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}

{/* Bouton Ajouter */}
{passwordEntered && (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
    <button
      onClick={() => {
        if (requestPassword()) {
          setShowForm(true);
          setEditIndex(null);
        }
      }}
      className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      <Plus className="w-5 h-5" />
      <span className="font-medium">{t('addProduct')}</span>
    </button>
  </div>
)}

{/* Formulaire produit */}
{showForm && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
    <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${
      darkMode ? 'bg-gray-800' : 'bg-white'
    } shadow-2xl`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {editIndex !== null ? '✏️ Modifier' : '➕ Ajouter'} Produit
          </h3>
          <button
            onClick={resetForm}
            className={`p-2 rounded-lg ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } transition-colors`}
          >
            ✕
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Colonne 1 */}
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('name')} *
              </label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Nom du produit..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('description')} *
              </label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Description du produit..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Prix CA$ 
                </label>
                <input
                  type="text"
                  value={newProduct.priceCa}
                  onChange={(e) => setNewProduct({...newProduct, priceCa: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="29.99"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Prix US$
                </label>
                <input
                  type="text"
                  value={newProduct.priceUs}
                  onChange={(e) => setNewProduct({...newProduct, priceUs: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="22.99"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Catégories
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_CATEGORIES[language].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      const cats = newProduct.categories.includes(category)
                        ? newProduct.categories.filter(c => c !== category)
                        : [...newProduct.categories, category];
                      setNewProduct({...newProduct, categories: cats});
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      newProduct.categories.includes(category)
                        ? 'bg-blue-500 text-white'
                        : darkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Colonne 2 */}
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Amazon CA
              </label>
              <input
                type="text"
                value={newProduct.amazonCa}
                onChange={(e) => setNewProduct({...newProduct, amazonCa: e.target.value})}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="https://amazon.ca/..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Amazon US
              </label>
              <input
                type="text"
                value={newProduct.amazonCom}
                onChange={(e) => setNewProduct({...newProduct, amazonCom: e.target.value})}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="https://amazon.com/..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                TikTok URL
              </label>
              <input
                type="text"
                value={newProduct.tiktokUrl}
                onChange={(e) => setNewProduct({...newProduct, tiktokUrl: e.target.value})}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="https://tiktok.com/..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('images')}
              </label>
              <div className="space-y-2">
                {newProduct.images.map((image, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => {
                        const newImages = [...newProduct.images];
                        newImages[index] = e.target.value;
                        setNewProduct({...newProduct, images: newImages});
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder={`Image ${index + 1} URL...`}
                    />
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = newProduct.images.filter((_, i) => i !== index);
                          setNewProduct({...newProduct, images: newImages});
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
                {newProduct.images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setNewProduct({...newProduct, images: [...newProduct.images, '']})}
                    className={`w-full py-2 border-2 border-dashed rounded-lg transition-colors ${
                      darkMode 
                        ? 'border-gray-600 text-gray-400 hover:border-gray-500' 
                        : 'border-gray-300 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    + {t('addImage')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            onClick={resetForm}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('cancel')}
          </button>
          <button
            onClick={saveProduct}
            disabled={!newProduct.name || !newProduct.description}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Contenu principal - Grille des produits */}
<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {/* Stats et info */}
  <div className="mb-8 text-center">
    <h2 className={`text-3xl lg:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      ✨ {filteredProducts.length} {t('totalProducts')}
    </h2>
    <div className="flex items-center justify-center space-x-8 text-sm">
      <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        <Eye className="w-4 h-4" />
        <span>{pageViews.toLocaleString()} vues</span>
      </div>
      <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>{onlineUsers} {t('onlineUsers')}</span>
      </div>
    </div>
  </div>

  {/* Loading */}
  {isLoading && (
    <div className="text-center py-20">
      <div className="inline-flex items-center space-x-3 text-lg font-medium">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
          {t('loading')}
        </span>
      </div>
    </div>
  )}

  {/* Grille produits */}
  {!isLoading && (
    <div className={
      viewMode === 'grid' 
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8' 
        : 'space-y-6'
    }>
      {filteredProducts.length === 0 ? (
        <div className="col-span-full text-center py-20">
          <div className={`text-6xl mb-4`}>🔍</div>
          <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Aucun produit trouvé
          </h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Essayez de modifier vos filtres de recherche
          </p>
        </div>
      ) : (
        filteredProducts.map((product, index) => (
          <ProductCard 
            key={product.id || index}
            product={product}
            index={index}
            darkMode={darkMode}
            viewMode={viewMode}
            passwordEntered={passwordEntered}
            userLikes={userLikes}
            onLike={handleLike}
            onShare={handleShare}
            onEdit={handleEdit}
            onDelete={deleteProduct}
            onSitestripeRequest={openSitestripeRequest}
          />
        ))
      )}
    </div>
  )}
</main>

// Composant ProductCard
function ProductCard({ 
  product, 
  index, 
  darkMode, 
  viewMode, 
  passwordEntered, 
  userLikes, 
  onLike, 
  onShare, 
  onEdit, 
  onDelete, 
  onSitestripeRequest 
}: {
  product: Product;
  index: number;
  darkMode: boolean;
  viewMode: 'grid' | 'list';
  passwordEntered: boolean;
  userLikes: Set<number>;
  onLike: (id: number) => void;
  onShare: (product: Product) => void;
  onEdit: (index: number) => void;
  onDelete: (id: number) => void;
  onSitestripeRequest: (product: Product) => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  const validImages = product.images.filter(img => img && img.trim());
  const currentImage = validImages[currentImageIndex] || '';

  if (viewMode === 'list') {
    return (
      <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-2xl ${
        darkMode 
          ? 'bg-gray-800 border-gray-600 hover:border-gray-500' 
          : 'bg-white border-gray-200 hover:border-blue-300'
      } group`}>
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-80 h-64 md:h-48 relative overflow-hidden">
            {currentImage && !imageError ? (
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-6xl ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                📦
              </div>
            )}
            
            {/* Navigation images */}
            {validImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  →
                </button>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {validImages.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col space-y-2">
              {product.verified && (
                <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center space-x-1">
                  <Star className="w-3 h-3" />
                  <span>Vérifié</span>
                </span>
              )}
              {product.trending && (
                <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Tendance</span>
                </span>
              )}
              {product.promoted && (
                <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                  Promo
                </span>
              )}
            </div>
          </div>

          {/* Contenu */}
          <div className="flex-1 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.name}
                </h3>
                <p className={`text-sm mb-3 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {product.description}
                </p>

                {/* Prix */}
                <div className="flex items-center space-x-4 mb-4">
                  {product.priceCa && (
                    <span className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {product.priceCa}$ CAD
                    </span>
                  )}
                  {product.priceUs && (
                    <span className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {product.priceUs}$ USD
                    </span>
                  )}
                </div>

                {/* Catégories */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.categories.map((cat, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        darkMode 
                          ? 'bg-gray-700 text-gray-300' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-4 text-sm mb-4">
                  <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Eye className="w-4 h-4" />
                    <span>{product.views}</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Heart className={`w-4 h-4 ${userLikes.has(product.id || 0) ? 'fill-current text-red-500' : ''}`} />
                    <span>{product.likes}</span>
                  </div>
                  {product.rating && (
                    <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Star className="w-4 h-4 fill-current text-yellow-500" />
                      <span>{product.rating}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions admin */}
              {passwordEntered && (
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => onEdit(index)}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => product.id && onDelete(product.id)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Actions utilisateur */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => onSitestripeRequest(product)}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Sitestripe</span>
              </button>

              {product.amazonCa && (
                <a
                  href={product.amazonCa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Amazon CA</span>
                </a>
              )}

              {product.amazonCom && (
                <a
                  href={product.amazonCom}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Amazon US</span>
                </a>
              )}

              {product.tiktokUrl && (
                <a
                  href={product.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  <Video className="w-4 h-4" />
                  <span>TikTok</span>
                </a>
              )}

              <button
                onClick={() => onLike(product.id || 0)}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  userLikes.has(product.id || 0)
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Heart className={`w-4 h-4 ${userLikes.has(product.id || 0) ? 'fill-current' : ''}`} />
                <span>{userLikes.has(product.id || 0) ? 'Aimé' : 'Aimer'}</span>
              </button>

              <button
                onClick={() => onShare(product)}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Partager</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue grille (mode par défaut)
  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
      darkMode 
        ? 'bg-gray-800 border-gray-600 hover:border-gray-500' 
        : 'bg-white border-gray-200 hover:border-blue-300'
    } group`}>
      {/* Image */}
      <div className="relative h-64 overflow-hidden">
        {currentImage && !imageError ? (
          <img
            src={currentImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-6xl ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            📦
          </div>
        )}
        
        {/* Navigation images */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
            >
              ←
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
            >
              →
            </button>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {validImages.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-2">
          {product.verified && (
            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center space-x-1">
              <Star className="w-3 h-3" />
              <span>Vérifié</span>
            </span>
          )}
          {product.trending && (
            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>Tendance</span>
            </span>
          )}
          {product.promoted && (
            <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
              Promo
            </span>
          )}
        </div>

        {/* Actions admin */}
        {passwordEntered && (
          <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(index)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => product.id && onDelete(product.id)}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-4">
        <h3 className={`text-lg font-bold mb-2 line-clamp-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {product.name}
        </h3>
        
        <p className={`text-sm mb-3 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {product.description}
        </p>

        {/* Prix */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {product.priceCa && (
              <span className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                {product.priceCa}$ CAD
              </span>
            )}
            {product.priceUs && (
              <span className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {product.priceUs}$ USD
              </span>
            )}
          </div>
          
          {product.rating && (
            <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Star className="w-4 h-4 fill-current text-yellow-500" />
              <span className="text-sm">{product.rating}</span>
            </div>
          )}
        </div>

        {/* Catégories */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.categories.slice(0, 3).map((cat, i) => (
            <span
              key={i}
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {cat}
            </span>
          ))}
          {product.categories.length > 3 && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
            }`}>
              +{product.categories.length - 3}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm mb-4">
          <div className={`flex items-center space-x-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{product.views}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className={`w-4 h-4 ${userLikes.has(product.id || 0) ? 'fill-current text-red-500' : ''}`} />
              <span>{product.likes}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => onSitestripeRequest(product)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Demander Sitestripe</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onLike(product.id || 0)}
              className={`flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                userLikes.has(product.id || 0)
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Heart className={`w-4 h-4 ${userLikes.has(product.id || 0) ? 'fill-current' : ''}`} />
              <span>{userLikes.has(product.id || 0) ? 'Aimé' : 'J\'aime'}</span>
            </button>

            <button
              onClick={() => onShare(product)}
              className={`flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Partager</span>
            </button>
          </div>

          {/* Liens externes */}
          <div className="grid grid-cols-3 gap-1">
            {product.amazonCa && (
              <a
                href={product.amazonCa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-2 py-1 bg-orange-500 text-white rounded text-xs font-medium hover:bg-orange-600 transition-colors"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                CA
              </a>
            )}
            
            {product.amazonCom && (
              <a
                href={product.amazonCom}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                US
              </a>
            )}
            
            {product.tiktokUrl && (
              <a
                href={product.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-2 py-1 bg-black text-white rounded text-xs font-medium hover:bg-gray-800 transition-colors"
              >
                <Video className="w-3 h-3 mr-1" />
                TikTok
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
