'use client'

interface Props {
  type: string;
  data: any;
  variant?: string;
  className?: string;
}

export default function PDFExport({ type, data, variant, className }: Props) {
  const handleExport = () => {
    // Placeholder for PDF export functionality
    alert('PDF export coming soon!');
  };

  return (
    <button
      onClick={handleExport}
      className={className || `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200`}
    >
      Export PDF
    </button>
  );
}