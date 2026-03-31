export function BrandingFooter() {
    return (
        <div className="fixed top-14 left-4 sm:top-auto sm:bottom-4 sm:right-4 sm:left-auto z-[100]">
            <div className="bg-black/60 backdrop-blur-sm text-white py-1 px-3 rounded-lg shadow-xl border border-gray-800/50 flex items-center space-x-2 text-[9px] sm:text-xs font-bold tracking-widest uppercase scale-90 sm:scale-100 origin-left">
                <span className="opacity-80">DEVELOPED BY</span>
                <a
                    href="https://digismartai.netlify.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:scale-110 transition-transform duration-200 block"
                    title="Visitar DigiSmart"
                >
                    <img
                        src="/digismart_logo.png"
                        alt="DigiSmart Logo"
                        className="h-4 sm:h-6 object-contain"
                    />
                </a>
            </div>
        </div>
    );
}
