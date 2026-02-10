export function BrandingFooter() {
    return (
        <div className="fixed bottom-4 right-4 z-[100]">
            <div className="bg-black text-white py-2 px-4 rounded-lg shadow-2xl border border-gray-800 flex items-center space-x-3 text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                <span className="opacity-90">DEVELOPED BY</span>
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
                        className="h-5 sm:h-6 object-contain"
                    />
                </a>
            </div>
        </div>
    );
}
