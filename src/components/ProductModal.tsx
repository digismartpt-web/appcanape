import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { productImagesService, getProPrice } from '../services/supabaseService';
import type { Product, ProductImage } from '../types';

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, sizeCode: string, sizeLabel: string, selectedOption?: string, quantity?: number) => void;
}

export function ProductModal({ product, isOpen, onClose, onAddToCart }: ProductModalProps) {
  const [selectedSizeCode, setSelectedSizeCode] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && product) {
      const firstSize = product.sizes?.[0];
      setSelectedSizeCode(firstSize?.code || '');
      setSelectedOption('');
      setQuantity(1);
      setImgIndex(0);
      // Fetch gallery images for this product
      productImagesService.getProductImages(product.id)
        .then(imgs => setGalleryImages(imgs))
        .catch(() => setGalleryImages([]));
    }
  }, [isOpen, product?.id]);

  if (!isOpen) return null;

  // Build full image list: main image + sorted gallery images (no duplicates)
  const allImages: string[] = [];
  if (product.image_url) allImages.push(product.image_url);
  const sorted = [...galleryImages].sort((a, b) => a.position - b.position);
  sorted.forEach(img => {
    if (img.image_url && img.image_url !== product.image_url) allImages.push(img.image_url);
  });

  const isProUser = user?.pro_validated === true;
  const proDiscount = user?.pro_discount_percent ?? 0;

  const selectedSize = product.sizes.find(s => s.code === selectedSizeCode);
  const effectivePrice = selectedSize
    ? (isProUser ? getProPrice(product, selectedSize.code, proDiscount) : selectedSize.price)
    : 0;
  const calculateTotal = () => effectivePrice * quantity;

  const handleAddToCart = () => {
    if (!user) { navigate('/auth'); return; }
    if (!selectedSize) { alert('Por favor selecione um tamanho.'); return; }
    if (product.has_options && product.options.length > 0 && !selectedOption) {
      alert('Por favor escolha uma opção (cor / material).'); return;
    }
    onAddToCart(product, selectedSize.code, selectedSize.label, selectedOption || undefined, quantity);
    setQuantity(1);
    onClose();
  };

  const prevImg = () => setImgIndex(i => (i - 1 + allImages.length) % allImages.length);
  const nextImg = () => setImgIndex(i => (i + 1) % allImages.length);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-[#1a1a1a] rounded-t-lg sm:rounded-lg w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-[#D4AF37]/20">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#D4AF37]/20 z-10 p-4 sm:p-6 flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-bold pr-4">{product.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 -m-2 touch-manipulation">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Carrousel */}
          {allImages.length > 0 && (
            <div className="relative">
              <img src={allImages[imgIndex]} alt={product.name}
                className="w-full h-64 object-contain rounded-lg bg-[#222222]" />
              {allImages.length > 1 && (
                <>
                  <button onClick={prevImg}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#1a1a1a]/80 border border-[#D4AF37]/30 rounded-full p-1 shadow hover:bg-[#D4AF37] hover:text-black text-white transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={nextImg}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#1a1a1a]/80 border border-[#D4AF37]/30 rounded-full p-1 shadow hover:bg-[#D4AF37] hover:text-black text-white transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="flex justify-center gap-2 mt-2">
                    {allImages.map((img, i) => (
                      <button key={i} onClick={() => setImgIndex(i)}
                        className={`w-12 h-12 rounded border-2 overflow-hidden transition-all ${i === imgIndex ? 'border-[#D4AF37]' : 'border-gray-600 opacity-60 hover:opacity-100'}`}>
                        <img src={img} alt="" className="w-full h-full object-contain bg-[#222222]" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Descrição */}
          {product.description && (
            <p className="text-gray-300">{product.description}</p>
          )}

          {/* Características */}
          {product.features.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Características</h3>
              <ul className="space-y-1">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dimensões */}
          {(product.width_cm || product.depth_cm || product.height_cm || product.weight_kg) && (
            <div>
              <h3 className="text-lg font-medium mb-2">Dimensões</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {product.width_cm && <div className="bg-[#222222] rounded-lg p-3 text-center border border-[#D4AF37]/10"><div className="text-lg font-bold text-[#D4AF37]">{product.width_cm}</div><div className="text-xs text-gray-400">Larg. (cm)</div></div>}
                {product.depth_cm && <div className="bg-[#222222] rounded-lg p-3 text-center border border-[#D4AF37]/10"><div className="text-lg font-bold text-[#D4AF37]">{product.depth_cm}</div><div className="text-xs text-gray-400">Prof. (cm)</div></div>}
                {product.height_cm && <div className="bg-[#222222] rounded-lg p-3 text-center border border-[#D4AF37]/10"><div className="text-lg font-bold text-[#D4AF37]">{product.height_cm}</div><div className="text-xs text-gray-400">Alt. (cm)</div></div>}
                {product.weight_kg && <div className="bg-[#222222] rounded-lg p-3 text-center border border-[#D4AF37]/10"><div className="text-lg font-bold text-[#D4AF37]">{product.weight_kg}</div><div className="text-xs text-gray-400">Peso (kg)</div></div>}
              </div>
            </div>
          )}

          {/* Tamanho */}
          {product.sizes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-medium">Tamanho</h3>
                {isProUser && (
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Preço Pro</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {product.sizes.map(size => {
                  const proP = isProUser ? getProPrice(product, size.code, proDiscount) : null;
                  return (
                    <button key={size.code} onClick={() => setSelectedSizeCode(size.code)}
                      className={`p-3 rounded-lg text-center border-2 transition-colors touch-manipulation ${selectedSizeCode === size.code ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-gray-600 hover:border-[#D4AF37]/40 bg-[#222222] text-gray-300'}`}>
                      <div className="font-semibold">{size.label}</div>
                      {proP !== null ? (
                        <>
                          <div className="text-lg font-bold mt-1 text-green-700">{proP.toFixed(2)}€</div>
                          <div className="text-xs text-gray-400 line-through">{size.price.toFixed(2)}€</div>
                        </>
                      ) : (
                        <div className="text-lg font-bold mt-1">{size.price.toFixed(2)}€</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opções */}
          {product.has_options && product.options.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Opções <span className="text-sm text-gray-500">(obrigatório)</span></h3>
              <div className="flex flex-wrap gap-2">
                {product.options.map(opt => (
                  <button key={opt} onClick={() => setSelectedOption(opt)}
                    className={`px-4 py-2 rounded-full text-sm border-2 transition-colors touch-manipulation ${selectedOption === opt ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] font-medium' : 'border-gray-600 hover:border-[#D4AF37]/40 bg-[#222222] text-gray-300'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantidade */}
          <div>
            <h3 className="text-lg font-medium mb-3">Quantidade</h3>
            <div className="flex items-center justify-center space-x-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-full bg-[#333333] hover:bg-[#D4AF37] hover:text-black text-white flex items-center justify-center text-xl font-bold touch-manipulation transition-colors" disabled={quantity <= 1}>−</button>
              <span className="text-2xl font-bold min-w-[3rem] text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-full bg-[#333333] hover:bg-[#D4AF37] hover:text-black text-white flex items-center justify-center text-xl font-bold touch-manipulation transition-colors">+</button>
            </div>
          </div>

          {/* Botão adicionar */}
          <div className="sticky bottom-0 bg-[#1a1a1a] pt-4 border-t border-[#D4AF37]/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-medium">Total:</span>
              <span className="text-2xl font-bold text-accent-600">{calculateTotal().toFixed(2)}€</span>
            </div>
            <button onClick={handleAddToCart}
              className="w-full bg-[#D4AF37] text-black py-3 px-6 rounded-lg font-bold hover:bg-[#B8941A] transition-colors touch-manipulation">
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
