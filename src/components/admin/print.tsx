import { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function HtmlToPdfDemo() {
  const captureRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    const element = captureRef.current;
    if (!element) return;

    // Take screenshot
    const canvas = await html2canvas(element, {
      scale: 2, // higher resolution
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");

    // Create a new PDF
    const pdf = new jsPDF("p", "mm", "a4"); // portrait, millimeters, A4
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Scale image to fit in A4
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let position = 0;
    if (imgHeight > pdfHeight) {
      // If content is longer than one page
      let heightLeft = imgHeight;
      while (heightLeft > 0) {
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        position -= pdfHeight;
        if (heightLeft > 0) pdf.addPage();
      }
    } else {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    }

    pdf.save("document.pdf");
  };

  return (
    <div className="p-8 space-y-4 text-center">
      <div
        ref={captureRef}
        className="bg-green-50 rounded-2xl p-6 shadow-lg inline-block text-left"
        style={{ width: "600px" }}
      >
        <h1 className="text-2xl font-bold text-green-700 mb-2">
          🌿 Report Example
        </h1>
        <p className="text-gray-700">
          This entire section will be captured and exported as a PDF using
          <code> html2canvas </code> + <code> jsPDF </code>.
        </p>
        <ul className="list-disc text-left ml-6 mt-3 text-gray-600">
          <li>Client-side only (no server needed)</li>
          <li>Maintains your layout</li>
          <li>Supports Tailwind styles</li>
        </ul>
      </div>

      <div>
        <button
          onClick={handleDownloadPdf}
          className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
        >
          Download as PDF
        </button>
      </div>
    </div>
  );
}
