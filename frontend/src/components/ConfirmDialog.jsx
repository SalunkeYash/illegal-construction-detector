import React from 'react';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', confirmColor = 'red' }) => {
  if (!isOpen) return null;

  const colorMap = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    green: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  };

  const btnClass = colorMap[confirmColor] || colorMap.red;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel && onCancel();
    }
  };

  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onCancel && onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full mx-4 p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-900">{title || 'Confirm Action'}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
