import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import PacmanLoader from 'react-spinners/PacmanLoader';
import { 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
} from "lucide-react";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import Link from 'next/link';
import { cn } from "@/lib/utils";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

interface PdfViewerProps {
  documentId: string;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function PdfViewer({ documentId, currentPage, onPageChange }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageNumber, setPageNumber] = useState(currentPage || 1);

  // Sync with parent's currentPage
  useEffect(() => {
    if (currentPage && currentPage !== pageNumber) {
      setPageNumber(currentPage);
    }
  }, [currentPage]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
    // Ensure current page is valid
    if (pageNumber > numPages) {
      setPageNumber(1);
      onPageChange(1);
    }
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('Error loading PDF:', err);
    setError('Failed to load PDF file.');
  };

  const handleRetry = useCallback(() => {
    setError(null);
    setKey(prev => prev + 1);
  }, []);

  const handlePageChange = (offset: number) => {
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      onPageChange(newPage);
    }
  };

  const handleZoom = (delta: number) => {
    setScale(prevScale => Math.max(0.5, Math.min(2, prevScale + delta)));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    setScale(1); // Reset zoom when toggling fullscreen
  };

  return (
    <div className={cn(
      "flex flex-col bg-background rounded-lg shadow-lg overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50" : "w-full h-full"
    )}>
      {/* Top Toolbar */}
      <div className="flex flex-col border-b bg-muted/40">
        {/* Back button and fullscreen */}
        <div className="flex items-center justify-between p-2 border-b">
          <Link href="/pdf" className="hover:opacity-80">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Documents
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(-1)}
              disabled={pageNumber <= 1 || error !== null}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm font-medium px-2">
              {error ? 'Error' : `Page ${pageNumber || 1} of ${numPages || 1}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={pageNumber >= numPages || error !== null}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom(-0.1)}
              title="Zoom Out"
              className="px-2"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom(0.1)}
              title="Zoom In"
              className="px-2"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotate}
              title="Rotate"
              className="px-2"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center justify-start min-h-full p-4">
          {error ? (
            <div className="text-center p-4">
              <div className="text-destructive mb-4">{error}</div>
              <Button 
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <Document
              key={key}
              file={`/api/pdf/${documentId}`}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                  <div className="flex items-center justify-center p-4">
                    <PacmanLoader color="#538B81" />
                  </div>
              }
            >
              <Page
                pageNumber={pageNumber || 1}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                scale={scale}
                rotate={rotation}
                loading={
                  <div className="flex items-center justify-center p-4">
                    <PacmanLoader color="#538B81" />
                  </div>
                }
              />
            </Document>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 