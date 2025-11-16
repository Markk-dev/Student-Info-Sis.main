import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Download, Printer } from 'lucide-react';
import { Button } from './button';

// Barcode component for generating and displaying barcodes

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  format?: string;
  className?: string;
  showActions?: boolean;
  plain?: boolean;
}

export function Barcode({
  value,
  width = 2,
  height = 60,
  displayValue = true,
  format = 'CODE128',
  className = '',
  showActions = false,
  plain = false
}: BarcodeProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: format,
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: 14,
          margin: 10,
          background: plain ? 'transparent' : '#ffffff',
          lineColor: '#000000',
          // Improve scanning from screen
          valid: function (valid: boolean) {
            return valid;
          }
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, width, height, displayValue, format, plain]);

  const handlePrint = () => {
    if (barcodeRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Student ID Barcode - ${value}</title>
              <style>
                body { 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh; 
                  margin: 0;
                  background: white;
                }
                svg { 
                  max-width: 100%; 
                  height: auto;
                }
              </style>
            </head>
            <body>
              ${barcodeRef.current.outerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    if (barcodeRef.current) {
      const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `barcode-${value}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  if (!value) {
    return null;
  }

  if (plain) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <svg ref={barcodeRef} className="max-w-full" style={{ imageRendering: 'crisp-edges' }} />
        {showActions && (
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-1"
            >
              <Printer className="h-3 w-3" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="bg-white p-4 rounded-lg border-2 border-black shadow-lg">
        <svg ref={barcodeRef} className="max-w-full" style={{ imageRendering: 'crisp-edges' }} />
      </div>
      {showActions && (
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1"
          >
            <Printer className="h-3 w-3" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        </div>
      )}
    </div>
  );
}

