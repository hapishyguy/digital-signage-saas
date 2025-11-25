import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, size = 'md' }) {
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" 
      onClick={onClose}
    >
      <div 
        className={`bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-h-[90vh] overflow-auto ${
          size === 'lg' ? 'max-w-4xl' : size === 'xl' ? 'max-w-6xl' : 'max-w-lg'
        }`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
