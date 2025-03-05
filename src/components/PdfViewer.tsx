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
  Maximize2,
  Menu
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

// Helper function to convert base64 to buffer
function base64ToBuffer(base64String: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:application\/pdf;base64,/, '');
  // Convert to binary string
  const binaryString = atob(base64Data);
  // Create buffer
  const buffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    buffer[i] = binaryString.charCodeAt(i);
  }
  return buffer;
}

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
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [documentTitle, setDocumentTitle] = useState<string>('');

  // Fetch PDF data
  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/pdf/${documentId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch PDF');
        }
        const data = await response.json();
        
        // Add validation and logging
        if (!data.data) {
          console.error('No PDF data received:', data);
          throw new Error('No PDF data received from server');
        }

        // Validate base64 format
        if (!data.data.startsWith('data:application/pdf;base64,')) {
          console.error('Invalid PDF data format:', data.data.substring(0, 50) + '...');
          throw new Error('Invalid PDF data format');
        }

        setPdfData(data.data);
        setDocumentTitle(data.title);
        setError(null);
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF file.');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchPdf();
    } else {
      setError('No document ID specified');
    }
  }, [documentId]);

  // Sync with parent's currentPage
  useEffect(() => {
    if (currentPage && currentPage !== pageNumber) {
      setPageNumber(currentPage);
    }
  }, [currentPage]);

  // Auto-adjust scale for mobile
  useEffect(() => {
    const adjustScale = () => {
      if (window.innerWidth < 768) {
        setScale(0.8);
      } else {
        setScale(1);
      }
    };

    adjustScale();
    window.addEventListener('resize', adjustScale);
    return () => window.removeEventListener('resize', adjustScale);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
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
    setScale(1);
  };

  return (
    <div className={cn(
      "flex flex-col bg-background rounded-lg shadow-lg overflow-hidden relative",
      isFullscreen ? "fixed inset-0 z-50" : "w-full h-full"
    )}>
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <Link href="/pdf" className="hover:opacity-80">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <h2 className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">
            {documentTitle}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="hidden lg:flex gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </span>
          </Button>
        </div>
      </div>

      {/* Mobile Controls Menu */}
      <div className={cn(
        "lg:hidden grid grid-cols-2 gap-2 p-2 bg-muted/40 border-b transition-all duration-300",
        showMobileMenu ? "block" : "hidden"
      )}>
        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-2 col-span-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(-1)}
            disabled={pageNumber <= 1 || error !== null}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            {error ? 'Error' : `${pageNumber} / ${numPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={pageNumber >= numPages || error !== null}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom(-0.1)}
            className="flex-1"
          >
            <ZoomOut className="h-4 w-4 mr-2" />
            Zoom Out
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom(0.1)}
            className="flex-1"
          >
            <ZoomIn className="h-4 w-4 mr-2" />
            Zoom In
          </Button>
        </div>

        {/* Additional Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className="flex-1"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Rotate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="flex-1"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            {isFullscreen ? 'Exit' : 'Full'}
          </Button>
        </div>
      </div>

      {/* Desktop Controls */}
      <div className="hidden lg:flex items-center justify-between p-2 border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(-1)}
            disabled={pageNumber <= 1 || error !== null}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm font-medium px-2">
            {error ? 'Error' : `${pageNumber} / ${numPages}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={pageNumber >= numPages || error !== null}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom(-0.1)}
              title="Zoom Out"
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
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRotate}
            title="Rotate"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <ScrollArea className="flex-1">
        <div 
          className="flex flex-col items-center justify-start min-h-full p-4"
          onClick={() => setShowMobileMenu(false)}
        >
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
          ) : loading ? (
            <div className="flex items-center justify-center p-4">
              <PacmanLoader color="#538B81" />
            </div>
          ) : (
            <Document
              key={key}
              file={pdfData ? {
                data: base64ToBuffer(pdfData)
              } : null}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(err) => {
                console.error('PDF load error:', err);
                onDocumentLoadError(err);
              }}
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
                className="touch-pan-y"
                onRenderError={(err) => {
                  console.error('Page render error:', err);
                  setError('Failed to render PDF page');
                }}
              />
            </Document>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 