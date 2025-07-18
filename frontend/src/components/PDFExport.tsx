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
      className={`bg-blue-600 text-white px-3 py-1 rounded text-sm ${className}`}
    >
      Export PDF
    </button>
  );
}