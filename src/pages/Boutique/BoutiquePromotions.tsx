import { useState, useRef, useEffect } from 'react';
import { Gift, Image as ImageIcon, Trash2, Check, Upload, Eye } from 'lucide-react';
import { PromotionsManager } from '../../components/PromotionsManager';
import { usePizzariaSettings } from '../../hooks/usePizzariaSettings';
import { bannerGalleryService } from '../../services/supabaseService';

export function BoutiquePromotions() {
  const { settings, updateSettings, loading } = usePizzariaSettings();
  const [gallery, setGallery] = useState<{ id: string; url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = bannerGalleryService.subscribeToGallery(
      images => setGallery(images),
      err => console.error('Gallery subscription error:', err)
    );
    return () => unsubscribe();
  }, []);

  const resizeImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = event => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_W = 1200;
          let w = img.width, h = img.height;
          if (w > MAX_W) { h *= MAX_W / w; w = MAX_W; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) { alert('Por favor selecione uma imagem.'); return; }
    setIsUploading(true);
    setUploadStatus('A processar…');
    try {
      const base64 = await resizeImageToBase64(file);
      if (base64.length > 900000) throw new Error('Imagem demasiado grande (limite 900 KB). Use uma imagem mais pequena.');
      setUploadStatus('A guardar…');
      await bannerGalleryService.addImage(base64, file.name);
      setUploadStatus('A ativar…');
      await updateSettings({ banner_image_url: base64, banner_active: true });
      alert('Imagem adicionada à galeria e ativada!');
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar imagem.');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (id: string, url: string) => {
    if (!confirm('Eliminar esta imagem da galeria?')) return;
    try {
      await bannerGalleryService.deleteImage(id);
      if (settings.banner_image_url === url) {
        await updateSettings({ banner_image_url: '', banner_active: false });
      }
    } catch {
      alert('Erro ao eliminar.');
    }
  };

  const handleSelectImage = async (url: string) => {
    await updateSettings({ banner_image_url: url, banner_active: true });
  };

  const toggleBanner = async () => {
    if (!settings.banner_image_url && !settings.banner_active) {
      alert('Selecione primeiro uma imagem.'); return;
    }
    await updateSettings({ banner_active: !settings.banner_active });
  };

  if (loading) return <div className="p-8 text-center text-primary-600">A carregar…</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 flex items-center gap-3">
        <Gift className="h-8 w-8 text-accent-500" />
        <div>
          <h1 className="text-3xl font-bold text-primary-800">Promoções & Marketing</h1>
          <p className="text-primary-600">Gira as ofertas, descontos e o banner promocional</p>
        </div>
      </div>

      {/* Banner section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-primary-900 flex items-center gap-2">
              <ImageIcon className="text-accent-500" /> Banner promocional
            </h2>
            <p className="text-sm text-gray-500 mt-1">Esta imagem é exibida no topo da página do catálogo para todos os visitantes.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <span className={`text-sm font-medium ${settings.banner_active ? 'text-green-600' : 'text-gray-500'}`}>
              {settings.banner_active ? 'Banner visível' : 'Banner oculto'}
            </span>
            <button onClick={toggleBanner}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.banner_active ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.banner_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {settings.banner_image_url && (
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Pré-visualização do banner</h3>
              {settings.banner_active && (
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> VISIBLE
                </span>
              )}
            </div>
            <div className={`relative rounded-xl overflow-hidden shadow border-2 ${settings.banner_active ? 'border-green-500' : 'border-gray-200 opacity-50'}`}>
              <img src={settings.banner_image_url} alt="Banner ativo" className="w-full h-auto object-contain bg-gray-50" style={{ maxHeight: 400 }} />
              {!settings.banner_active && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <span className="bg-white/90 text-gray-800 px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-400" /> Banner oculto
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Biblioteca de imagens</h3>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                className="flex items-center gap-2 bg-accent-500 text-white text-sm font-bold px-4 py-2 rounded-md hover:bg-accent-600 transition disabled:opacity-50">
                <Upload className="h-4 w-4" />
                {isUploading ? (uploadStatus || 'A carregar…') : 'Adicionar imagem'}
              </button>
            </div>
          </div>

          {gallery.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-gray-400">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-40" />
              <p>Biblioteca vazia.</p>
              <p className="text-xs">Carregue imagens para usar como banner.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {gallery.map(img => (
                <div key={img.id}
                  onClick={() => handleSelectImage(img.url)}
                  className={`group relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${settings.banner_image_url === img.url ? 'border-accent-500 ring-2 ring-accent-200' : 'border-gray-200 hover:border-gray-400'}`}>
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button onClick={e => { e.stopPropagation(); handleDeleteImage(img.id, img.url); }}
                      className="bg-white text-red-500 p-2 rounded-full hover:bg-red-50 shadow">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {settings.banner_image_url === img.url && (
                    <div className="absolute top-2 right-2 bg-accent-500 text-white p-1 rounded-full shadow z-10">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PromotionsManager />
    </div>
  );
}
