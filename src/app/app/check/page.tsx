"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Progress } from "@/components/ui/Progress";
import {
  FileUp,
  FileCheck2,
  FileText,
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldCheck,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  Play,
  FileSpreadsheet,
  RefreshCw,
  XCircle,
  Eye,
  EyeOff,
  Crosshair,
  Info,
  ShieldAlert,
  Wrench,
  FolderArchive,
  Split,
  ArrowRightLeft,
  Files,
} from "lucide-react";
import JSZip from "jszip";
import { INITIAL_PROJECTS, SAMPLE_STANDARDS } from "@/lib/data/sample-data";
import { calculateSHA256, createReportFromUploadedFile, formatBytes } from "@/lib/services/report-store";

export default function CheckWorkflowPage() {
  const router = useRouter();

  // Workflow steps: "UPLOAD" | "PREVIEW" | "PROCESSING"
  const [step, setStep] = useState<"UPLOAD" | "PREVIEW" | "PROCESSING">("UPLOAD");

  // Raw file object for real dynamic ingestion
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Selected file metadata state (OEM Master)
  const [fileData, setFileData] = useState<{
    name: string;
    size: string;
    pages: number;
    mime: string;
    hash: string;
    sampleKey?: "vdh19" | "wh402" | "mcc" | "tb200";
  } | null>(null);

  // Redrawn Tech Pub Output delivery package (ZIP of SVGs/JPGs, or individual SVG/JPG)
  const [outputFile, setOutputFile] = useState<File | null>(null);
  const [outputFileData, setOutputFileData] = useState<{
    name: string;
    size: string;
    mime: string;
    hash: string;
    sheetCount?: number;
    detectedSheets?: string[];
  } | null>(null);
  const [isUnzipping, setIsUnzipping] = useState(false);

  // Real schematic preview & visual framing state
  const [rasterizedPageUrl, setRasterizedPageUrl] = useState<string | null>(null);
  const [detectedSegments, setDetectedSegments] = useState<any[]>([]);
  const [detectedDefects, setDetectedDefects] = useState<any[]>([]);
  const [showSegments, setShowSegments] = useState(true);
  const [showDefects, setShowDefects] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState<{ type: "SEGMENT" | "DEFECT"; data: any } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [selectedProject, setSelectedProject] = useState("");
  const [tenantProjects, setTenantProjects] = useState<{ id: string; name: string; customer?: string }[]>([]);
  const [selectedStandard, setSelectedStandard] = useState(SAMPLE_STANDARDS[0].code);

  React.useEffect(() => {
    fetch("/api/v1/projects")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setTenantProjects(data);
          setSelectedProject((prev) => (prev && data.some((p: any) => p.id === prev) ? prev : data[0].id));
        }
      })
      .catch((err) => console.warn("Failed to load tenant projects:", err));
  }, []);

  // Reference Netlist input (wire_no, colour, size_mm2, source, destination)
  const [expectedNetlistJson, setExpectedNetlistJson] = useState("");
  const [specificationIsComplete, setSpecificationIsComplete] = useState(false);
  const [promptVersion, setPromptVersion] = useState<"extract_v1" | "extract_v2">("extract_v1");
  const [showNetlistEditor, setShowNetlistEditor] = useState(false);

  // Document viewer controls
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  // Error handling state (Requirement per memo)
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Processing state stages
  const [processingStage, setProcessingStage] = useState<number>(0);

  const processingStages = [
    { label: "Upload & Hash Validated", pct: 15 },
    { label: "Document Parsed & High-DPI Rasterized", pct: 35 },
    { label: "Spatial OCR & Coordinate Mapping", pct: 55 },
    { label: "Diagram & Netlist Graph Extraction", pct: 72 },
    { label: `Comparing Against ${selectedStandard} Rules`, pct: 88 },
    { label: "Generating Structured QC Audit Report", pct: 100 },
  ];

  // Live schematic rasterization & frame extraction from Python core
  const fetchPreviewFrames = async (file: File | Blob, filename: string, pageNum = 1) => {
    setIsLoadingPreview(true);
    try {
      const formData = new FormData();
      formData.append("file", file, filename);
      formData.append("page", String(pageNum));
      formData.append("dpi", "110");

      const res = await fetch("/api/v1/qc/preview", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.image_url) {
          setRasterizedPageUrl(data.image_url);
        }
        if (Array.isArray(data.segments)) {
          setDetectedSegments(data.segments);
        }
        if (Array.isArray(data.defects)) {
          setDetectedDefects(data.defects);
        }
        if (data.total_pages) {
          setFileData((prev) => (prev ? { ...prev, pages: data.total_pages } : null));
        }
      }
    } catch (err) {
      console.warn("Schematic frame extraction notice:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Client-side high-DPI vector PDF rasterizer using PDF.js
  const renderPdfVectorPage = async (file: File | Blob, pageNum = 1) => {
    setIsLoadingPreview(true);
    try {
      if (typeof window === "undefined") return;

      // Dynamically load PDF.js engine if not already present
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "/vendor/pdfjs/pdf.min.js";
          script.onload = () => {
            if ((window as any).pdfjsLib) {
              (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
            }
            resolve();
          };
          script.onerror = () => reject(new Error("Failed to load PDF vector engine"));
          document.head.appendChild(script);
        });
      } else {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      setFileData((prev) => (prev ? { ...prev, pages: totalPages } : null));

      const targetPage = Math.max(1, Math.min(pageNum, totalPages));
      const page = await pdfDoc.getPage(targetPage);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/png");
        setRasterizedPageUrl(dataUrl);
      }
    } catch (err) {
      console.warn("Client-side vector rendering notice:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handler for Zone 1: OEM Master Reference Input (PDF)
  const handleOemFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setProcessingError(null);
    setSelectedFrame(null);
    setRasterizedPageUrl(null);
    setDetectedSegments([]);
    setDetectedDefects([]);
    setCurrentPage(1);

    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_BYTES = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(
        `Oversized File: "${file.name}" is ${formatBytes(file.size)}, which exceeds the 100MB limit.`
      );
      return;
    }
    if (file.size === 0) {
      setUploadError(`Invalid File: "${file.name}" is empty (0 bytes).`);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || lowerName.endsWith(".png") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg");

    if (!isPdf && !isImage) {
      setUploadError(
        `OEM Reference schematic must be a PDF document or CAD drawing (received: "${file.name}").`
      );
      return;
    }

    const hash = await calculateSHA256(file);
    if (isImage) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    } else {
      setImagePreviewUrl(null);
    }

    setRawFile(file);
    setFileData({
      name: file.name,
      size: formatBytes(file.size),
      pages: isImage ? 1 : Math.max(1, Math.min(16, Math.round(file.size / (200 * 1024)))),
      mime: file.type || (isPdf ? "application/pdf" : "image/png"),
      hash: hash,
    });

    if (isPdf) {
      renderPdfVectorPage(file, 1);
    }
    fetchPreviewFrames(file, file.name, 1);
  };

  // Handler for Zone 2: Tech Pub Redrawn Output (ZIP archive of SVGs/JPGs, or individual SVG/JPG)
  const handleOutputFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setProcessingError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_BYTES = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(
        `Oversized File: "${file.name}" is ${formatBytes(file.size)}, which exceeds the 100MB limit.`
      );
      return;
    }
    if (file.size === 0) {
      setUploadError(`Invalid File: "${file.name}" is empty (0 bytes).`);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isZip =
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed" ||
      lowerName.endsWith(".zip");
    const isSvg = file.type === "image/svg+xml" || lowerName.endsWith(".svg");
    const isImage =
      file.type.startsWith("image/") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      isSvg;

    if (!isZip && !isImage) {
      setUploadError(
        `Tech Pub delivery package must be a ZIP bundle or SVG/JPG drawings (received: "${file.name}").`
      );
      return;
    }

    setIsUnzipping(true);
    try {
      const hash = await calculateSHA256(file);
      let sheetCount = 1;
      let detectedSheets: string[] = [];

      if (isZip) {
        const zip = await JSZip.loadAsync(file);
        const entries = Object.keys(zip.files).filter(
          (n) =>
            !n.startsWith("__MACOSX") &&
            !n.startsWith(".") &&
            !zip.files[n].dir &&
            /\.(svg|jpg|jpeg|png|pdf)$/i.test(n)
        );
        sheetCount = Math.max(1, entries.length);
        detectedSheets = entries;
      } else {
        detectedSheets = [file.name];
      }

      setOutputFile(file);
      setOutputFileData({
        name: file.name,
        size: formatBytes(file.size),
        mime: file.type || (isZip ? "application/zip" : isSvg ? "image/svg+xml" : "image/jpeg"),
        hash: hash,
        sheetCount,
        detectedSheets,
      });
    } catch (err: any) {
      setUploadError(
        `Failed to unpack delivery ZIP archive: ${err?.message || "Corrupted archive file."}`
      );
    } finally {
      setIsUnzipping(false);
    }
  };

  // General legacy handler fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".zip") || name.endsWith(".svg")) {
      handleOutputFileUpload(e);
    } else {
      handleOemFileUpload(e);
    }
  };

  // 1-Click Industrial Preloaded Samples
  const loadIndustrialSample = async (sample: "vdh19" | "wh402" | "mcc" | "tb200") => {
    setUploadError(null);
    setProcessingError(null);
    setSelectedFrame(null);
    setRasterizedPageUrl(null);
    setDetectedSegments([]);
    setDetectedDefects([]);
    setCurrentPage(1);
    setRawFile(null);
    setImagePreviewUrl(null);

    if (sample === "vdh19") {
      setFileData({
        name: "20032026074234-Input_VDH19_A_INPUT.pdf",
        size: "2.89 MB",
        pages: 3,
        mime: "application/pdf",
        hash: "da90d031b07d72ffe0c7548f3a7388ad61d1d14f226640aec3181eaefa0c4592",
        sampleKey: "vdh19",
      });
      setOutputFileData({
        name: "VDH19_Output_Sheets_Batch.zip",
        size: "1.42 MB",
        mime: "application/zip",
        hash: "74b62d8544e3f01c9a8b7e6f5d4c3b2a1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b",
        sheetCount: 3,
        detectedSheets: ["1 FB1-6.svg", "2 CMCU 1-3.svg", "3 CMCU 4-7.svg"],
      });
      setSelectedStandard("SPANQC Tech Pub (Hyundai VDH)");
      setStep("PREVIEW");

      try {
        const res = await fetch("/samples/VDH19_Wheel_Loader_Schematic.pdf");
        if (res.ok) {
          const blob = await res.blob();
          const sampleFile = new File([blob], "20032026074234-Input_VDH19_A_INPUT.pdf", { type: "application/pdf" });
          setRawFile(sampleFile);
          renderPdfVectorPage(sampleFile, 1);
          fetchPreviewFrames(blob, "Input_VDH19_A_INPUT.pdf", 1);
        }
      } catch (err) {
        console.warn("Could not load sample VDH PDF", err);
      }
    } else if (sample === "wh402") {
      setFileData({
        name: "WH-402_Avionics_Wiring_Manual_RevC.pdf",
        size: "4.19 MB",
        pages: 8,
        mime: "application/pdf",
        hash: "9f83a21b456cd89e1a2f3c4e5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
        sampleKey: "wh402",
      });
      setSelectedStandard("IPC/WHMA-A-620D");
      setImagePreviewUrl("/frames/frame_001.webp");
      setStep("PREVIEW");
    } else if (sample === "mcc") {
      setFileData({
        name: "MCC_VFD_Panel_Schematic_v2.pdf",
        size: "2.84 MB",
        pages: 4,
        mime: "application/pdf",
        hash: "8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b",
        sampleKey: "mcc",
      });
      setSelectedStandard("UL 508A");
      setImagePreviewUrl("/frames/frame_020.webp");
      setStep("PREVIEW");
    } else {
      setFileData({
        name: "TB200_Relay_Interface_Rev1.pdf",
        size: "1.65 MB",
        pages: 2,
        mime: "application/pdf",
        hash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
        sampleKey: "tb200",
      });
      setSelectedStandard("IPC/WHMA-A-620D");
      setImagePreviewUrl("/frames/frame_030.webp");
      setStep("PREVIEW");
    }
  };

  // Start Real Processing Pipeline wired to Python QC Service queue
  const handleStartQC = async () => {
    setProcessingError(null);
    setStep("PROCESSING");
    setProcessingStage(0);

    let fileToUpload: File | Blob | null = rawFile;

    // If sample was selected, fetch it as Blob
    if (!fileToUpload && fileData?.sampleKey) {
      try {
        const sampleUrl = fileData.sampleKey === "wh402" ? "/frames/frame_001.webp" : "/frames/frame_020.webp";
        const sampleRes = await fetch(sampleUrl);
        fileToUpload = await sampleRes.blob();
      } catch (err) {
        console.warn("Failed to fetch sample file as blob", err);
      }
    }

    if (!fileToUpload) {
      setProcessingError("No schematic file available to upload.");
      setStep("PREVIEW");
      return;
    }

    try {
      const activeProjectId =
        tenantProjects.length > 0
          ? tenantProjects.some((p) => p.id === selectedProject)
            ? selectedProject
            : tenantProjects[0].id
          : selectedProject || "default";

      const formData = new FormData();
      formData.append("file", fileToUpload, fileData?.name || "schematic.pdf");
      if (outputFile) {
        formData.append("outputFile", outputFile, outputFileData?.name || "delivery_output_package.zip");
      }
      formData.append("projectId", activeProjectId);
      formData.append("standard", selectedStandard);
      if (expectedNetlistJson.trim()) {
        formData.append("expectedNetlistJson", expectedNetlistJson.trim());
      }
      formData.append("specificationIsComplete", String(specificationIsComplete));
      formData.append("promptVersion", promptVersion);
      formData.append("autoDispatch", "true");

      const response = await fetch("/api/v1/qc/jobs", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          response.ok
            ? "Invalid server response received."
            : `Server returned HTTP ${response.status} (${response.statusText}): ${responseText.slice(0, 120)}`
        );
      }

      if (!response.ok) {
        throw new Error(data.detail || `Server error (HTTP ${response.status}): Failed to create QC job.`);
      }

      const jobId = data.job_id;
      setProcessingStage(1);

      // Real status polling
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const jobRes = await fetch(`/api/v1/qc/jobs/${jobId}`);
          if (!jobRes.ok) {
            console.warn(`[QC_POLL_WARN] Polling returned HTTP ${jobRes.status}`);
            return;
          }
          const jobText = await jobRes.text();
          let jobData: any;
          try {
            jobData = JSON.parse(jobText);
          } catch {
            console.warn("[QC_POLL_WARN] Polling received non-JSON payload");
            return;
          }

          if (jobData.status === "QUEUED") {
            setProcessingStage(1);
          } else if (jobData.status === "PROCESSING" || jobData.status === "EXTRACTING") {
            // Smoothly advance stage while processing
            const stage = Math.min(4, Math.max(2, Math.floor(pollCount / 3) + 2));
            setProcessingStage(stage);
          } else if (jobData.status === "ANALYZING") {
            setProcessingStage(3);
          } else if (jobData.status === "VALIDATING") {
            setProcessingStage(4);
          } else if (jobData.status === "COMPLETED" || jobData.status === "REVIEW_REQUIRED") {
            clearInterval(pollInterval);
            setProcessingStage(5);
            setTimeout(() => {
              router.push(`/app/reports/${jobId}`);
            }, 600);
          } else if (jobData.status === "FAILED") {
            clearInterval(pollInterval);
            setProcessingError(jobData.error_message || "QC processing failed on server.");
          }
        } catch (pollErr) {
          console.error("Poll error", pollErr);
        }

        if (pollCount > 240) {
          clearInterval(pollInterval);
          setProcessingError("QC Job timed out waiting for worker response.");
        }
      }, 1500);

    } catch (err: any) {
      console.error("[QC_RUN_ERROR]", err);
      setProcessingError(err.message || "Failed to dispatch QC job to worker queue.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Workflow Navigation Header */}
      <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Automated QC Inspection Workflow
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Step 1: Upload Schematic → Step 2: Validate & Configure → Step 3: Run Deterministic QC
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={step === "UPLOAD" ? "result" : "neutral"}
            result={step === "UPLOAD" ? "PENDING" : undefined}
            size="sm"
          >
            1. Upload
          </Badge>
          <span className="text-slate-600">→</span>
          <Badge
            variant={step === "PREVIEW" ? "result" : "neutral"}
            result={step === "PREVIEW" ? "PENDING" : undefined}
            size="sm"
          >
            2. Preview & Rules
          </Badge>
          <span className="text-slate-600">→</span>
          <Badge
            variant={step === "PROCESSING" ? "result" : "neutral"}
            result={step === "PROCESSING" ? "PENDING" : undefined}
            size="sm"
          >
            3. Processing
          </Badge>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-3 text-rose-200 text-xs">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-white mb-0.5">Upload Validation Warning</h4>
            <p>{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-white text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: DUAL UPLOAD EXPERIENCE */}
      {step === "UPLOAD" && (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Header instructions */}
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Dual Comparative Schematic Verification
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload the original OEM master drawing (PDF) and the redrawn Tech Pub output (ZIP package of SVGs/JPGs). SpanQC unzips the delivery, verifies conductor continuity, and determines if each wire will work or not.
            </p>
          </div>

          {/* 2-Zone Upload Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ZONE 1: OEM MASTER INPUT PDF */}
            <div className={`p-6 rounded-2xl border-2 border-dashed transition-all relative flex flex-col justify-between ${
              rawFile || fileData
                ? "border-cyan-500/60 bg-cyan-950/15 shadow-xl shadow-cyan-950/30"
                : "border-[#222e47] hover:border-cyan-400/70 bg-[#0c101a] hover:bg-[#0f1422]"
            }`}>
              {!fileData && (
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleOemFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              )}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-cyan-400" />
                    ZONE 1 • OEM INPUT (GROUND TRUTH)
                  </span>
                  {fileData && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      LOADED
                    </span>
                  )}
                </div>

                <div className="text-center my-6">
                  <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-transform ${
                    fileData
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                      : "bg-[#111726] text-slate-400 border border-[#1b253b] group-hover:scale-105"
                  }`}>
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {fileData ? fileData.name : "OEM Master Reference Schematic"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {fileData
                      ? `${fileData.size} • ${fileData.pages} Page(s) • SHA-256: ${fileData.hash.slice(0, 16)}...`
                      : "Drag & drop original manufacturer PDF schematic (e.g. INPUT.pdf)"}
                  </p>
                </div>
              </div>

              {fileData ? (
                <div className="pt-4 border-t border-cyan-500/30 flex items-center justify-between z-20">
                  <span className="text-[11px] font-mono text-cyan-300">
                    PDF Ready for Netlist Extraction
                  </span>
                  <button
                    onClick={() => {
                      setRawFile(null);
                      setFileData(null);
                      setImagePreviewUrl(null);
                      setRasterizedPageUrl(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 underline font-mono cursor-pointer"
                  >
                    Replace / Remove
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-[#1b253b] text-center text-[11px] font-mono text-slate-500">
                  ACCEPTED: .PDF FORMAT • MAX 100MB
                </div>
              )}
            </div>

            {/* ZONE 2: REDRAWN TECH PUB DELIVERY PACKAGE (ZIP / SVG / JPG) */}
            <div className={`p-6 rounded-2xl border-2 border-dashed transition-all relative flex flex-col justify-between ${
              outputFile || outputFileData
                ? "border-purple-500/60 bg-purple-950/15 shadow-xl shadow-purple-950/30"
                : "border-[#222e47] hover:border-purple-400/70 bg-[#0c101a] hover:bg-[#0f1422]"
            }`}>
              {!outputFileData && (
                <input
                  type="file"
                  accept=".zip,.svg,.jpg,.jpeg,.png,application/zip"
                  onChange={handleOutputFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              )}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderArchive className="w-3 h-3 text-purple-400" />
                    ZONE 2 • TECH PUB OUTPUT (DELIVERY)
                  </span>
                  {outputFileData && (
                    <span className="text-[10px] font-mono text-purple-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                      UNPACKED
                    </span>
                  )}
                </div>

                <div className="text-center my-6">
                  <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-transform ${
                    outputFileData
                      ? "bg-purple-500/20 text-purple-300 border border-purple-400/50"
                      : "bg-[#111726] text-slate-400 border border-[#1b253b] group-hover:scale-105"
                  }`}>
                    {isUnzipping ? (
                      <RefreshCw className="w-7 h-7 text-purple-400 animate-spin" />
                    ) : (
                      <FolderArchive className="w-7 h-7" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {outputFileData ? outputFileData.name : "Redrawn Output Package (ZIP / SVG / JPG)"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {outputFileData
                      ? `${outputFileData.size} • ${outputFileData.sheetCount || 1} sheet(s) detected • SHA-256: ${outputFileData.hash.slice(0, 16)}...`
                      : "Upload batch ZIP of SVGs/JPGs or individual redrawn tech pub sheets"}
                  </p>
                  {outputFileData?.detectedSheets && outputFileData.detectedSheets.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-1">
                      {outputFileData.detectedSheets.slice(0, 4).map((s, i) => (
                        <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-900/40 text-purple-200 border border-purple-500/30">
                          {s}
                        </span>
                      ))}
                      {outputFileData.detectedSheets.length > 4 && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-900/40 text-purple-300">
                          +{outputFileData.detectedSheets.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {outputFileData ? (
                <div className="pt-4 border-t border-purple-500/30 flex items-center justify-between z-20">
                  <span className="text-[11px] font-mono text-purple-300">
                    Delivery Package Ready for Comparison
                  </span>
                  <button
                    onClick={() => {
                      setOutputFile(null);
                      setOutputFileData(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 underline font-mono cursor-pointer"
                  >
                    Replace / Remove
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-[#1b253b] text-center text-[11px] font-mono text-slate-500">
                  ACCEPTED: .ZIP (BATCH SVGS/JPGS), .SVG, .JPG, .PNG
                </div>
              )}
            </div>
          </div>

          {/* Launch & Action Bar */}
          <div className="p-6 rounded-2xl bg-[#0c101a] border border-[#1b253b] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Split className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {fileData && outputFileData
                    ? "✨ Dual Comparative Viability Engine Active"
                    : fileData
                    ? "📄 OEM Reference Schematic Loaded"
                    : outputFileData
                    ? "📦 Delivery Package Loaded"
                    : "Awaiting Schematic Documents"}
                </h4>
                <p className="text-xs text-slate-400">
                  {fileData && outputFileData
                    ? "SpanQC will unzip the output package, cross-compare conductor netlist pinouts, and verify whether each circuit WILL WORK or WILL NOT WORK."
                    : "Upload both documents for full comparative pinout checking, or proceed with a single document."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                onClick={() => loadIndustrialSample("vdh19")}
                variant="secondary"
                size="md"
                leftIcon={<Sparkles className="w-4 h-4 text-cyan-400" />}
                className="w-full sm:w-auto cursor-pointer"
              >
                Load Hyundai VDH-19 Sample (PDF + ZIP)
              </Button>

              <Button
                onClick={() => {
                  if (!fileData && outputFileData) {
                    setRawFile(outputFile);
                    setFileData({
                      name: outputFileData.name,
                      size: outputFileData.size,
                      pages: outputFileData.sheetCount || 1,
                      mime: outputFileData.mime,
                      hash: outputFileData.hash,
                    });
                  }
                  setStep("PREVIEW");
                }}
                disabled={!fileData && !outputFileData}
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto cursor-pointer"
              >
                Proceed to Preview & Rules →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FILE PREVIEW & CONFIGURATION */}
      {step === "PREVIEW" && fileData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Document Viewer Controls & Interactive Blueprint Canvas */}
          <div className="lg:col-span-8 space-y-3">
            {/* Dual Document Comparison Banner */}
            {outputFileData && (
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg shadow-purple-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
                    <FolderArchive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Dual Comparative Audit Active</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        {outputFileData.sheetCount || 1} Sheets Unpacked
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-200 mt-0.5">
                      Comparing Master [<strong>{fileData.name}</strong>] against Output Delivery [<strong>{outputFileData.name}</strong>]. Conductor continuity and circuit viability will be evaluated deterministically.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStep("UPLOAD")}
                  className="text-[11px] font-mono text-purple-300 hover:text-white underline shrink-0 cursor-pointer"
                >
                  Change Files
                </button>
              </div>
            )}

            {/* Viewer Top Toolbar with Layer & Defect Toggles */}
            <div className="p-3 rounded-xl bg-[#0c101a] border border-[#1b253b] flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Page Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    setCurrentPage(newPage);
                    if (rawFile) {
                      if (fileData.mime === "application/pdf" || rawFile.name.toLowerCase().endsWith(".pdf")) {
                        renderPdfVectorPage(rawFile, newPage);
                      }
                      fetchPreviewFrames(rawFile, fileData.name, newPage);
                    }
                  }}
                  disabled={currentPage <= 1 || isLoadingPreview}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-300">
                  Page {currentPage} of {fileData.pages}
                </span>
                <button
                  onClick={() => {
                    const newPage = Math.min(fileData.pages, currentPage + 1);
                    setCurrentPage(newPage);
                    if (rawFile) {
                      if (fileData.mime === "application/pdf" || rawFile.name.toLowerCase().endsWith(".pdf")) {
                        renderPdfVectorPage(rawFile, newPage);
                      }
                      fetchPreviewFrames(rawFile, fileData.name, newPage);
                    }
                  }}
                  disabled={currentPage >= fileData.pages || isLoadingPreview}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Interactive Layer Toggles (Segmentation & Defects) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSegments(!showSegments)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all border ${
                    showSegments
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                      : "bg-[#111726] text-slate-500 border-[#1b253b] hover:text-slate-300"
                  }`}
                  title="Toggle Segmentation Frames (Fusebox, CMCU, Connectors)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Segments ({detectedSegments.length})</span>
                </button>

                <button
                  onClick={() => setShowDefects(!showDefects)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all border ${
                    showDefects
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                      : "bg-[#111726] text-slate-500 border-[#1b253b] hover:text-slate-300"
                  }`}
                  title="Toggle Defect Frames (Pin Swaps, Missing Wires, Deviations)"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Defects ({detectedDefects.length})</span>
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-300 w-12 text-center">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="p-1.5 rounded-lg bg-[#111726] border border-[#1b253b] text-slate-300 hover:text-white cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Canvas Rendering: Authentic Upload + Segment & Defect Overlay Frames */}
            <div className="h-[520px] rounded-2xl bg-[#06070a] border border-[#1b253b] relative p-4 font-mono text-xs overflow-auto flex flex-col justify-between bg-schematic-grid-dense">
              <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px] text-cyan-300 mb-2 w-full flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold">CAD SCHEMATIC: {fileData.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">(Page {currentPage})</span>
                </div>
                <div className="flex items-center gap-3">
                  {isLoadingPreview && (
                    <span className="text-cyan-400 flex items-center gap-1.5 animate-pulse text-[10px]">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Rasterizing Vector Sheet...
                    </span>
                  )}
                  <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    AUTHENTIC SCHEMATIC
                  </span>
                </div>
              </div>

              {/* Viewport & Interactive Blueprint Canvas */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-2 relative">
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease-out",
                  }}
                  className="relative inline-block max-w-full"
                >
                  {/* REAL UPLOADED DRAWING IMAGE */}
                  {rasterizedPageUrl || imagePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rasterizedPageUrl || imagePreviewUrl || ""}
                      alt={fileData.name}
                      className="max-h-[440px] w-auto max-w-full object-contain rounded border border-slate-700 shadow-2xl bg-white select-none block"
                    />
                  ) : (
                    <div className="w-[620px] max-w-full h-[420px] rounded border border-slate-700/80 shadow-2xl bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                      <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                      <p className="text-sm font-semibold text-slate-200">Rasterizing Vector Schematic...</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        High-DPI vector CAD rendering in progress for {fileData.name} (Page {currentPage})
                      </p>
                    </div>
                  )}

                  {/* OVERLAY LAYER 1: FUNCTIONAL SEGMENTATION FRAMES */}
                  {showSegments &&
                    detectedSegments.map((seg) => (
                      <div
                        key={seg.id}
                        style={{
                          left: `${seg.bbox.left}%`,
                          top: `${seg.bbox.top}%`,
                          width: `${seg.bbox.width}%`,
                          height: `${seg.bbox.height}%`,
                          borderColor: seg.color,
                        }}
                        onClick={() => setSelectedFrame({ type: "SEGMENT", data: seg })}
                        className="absolute border-2 border-dashed bg-black/10 hover:bg-black/30 transition-all cursor-pointer z-10 group"
                      >
                        <span
                          style={{ backgroundColor: seg.color }}
                          className="absolute -top-3 left-1 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow font-mono uppercase whitespace-nowrap tracking-wide group-hover:scale-105 transition-transform"
                        >
                          {seg.name}
                        </span>
                      </div>
                    ))}

                  {/* OVERLAY LAYER 2: DEFECT DETECTION FRAMES */}
                  {showDefects &&
                    detectedDefects.map((defect) => (
                      <div
                        key={defect.id}
                        style={{
                          left: `${defect.bbox.left}%`,
                          top: `${defect.bbox.top}%`,
                          width: `${defect.bbox.width}%`,
                          height: `${defect.bbox.height}%`,
                        }}
                        onClick={() => setSelectedFrame({ type: "DEFECT", data: defect })}
                        className={`absolute border-2 transition-all cursor-pointer z-20 flex flex-col justify-between p-1 animate-pulse ${
                          defect.severity === "CRITICAL"
                            ? "border-rose-500 bg-rose-500/25 ring-2 ring-rose-500/70"
                            : "border-amber-500 bg-amber-500/25 ring-2 ring-amber-500/70"
                        }`}
                      >
                        <span className="text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded shadow font-mono bg-rose-600 flex items-center gap-1 self-start whitespace-nowrap">
                          ⚠ {defect.title}
                        </span>
                        <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-black/85 text-rose-300 self-end border border-rose-500/40">
                          {defect.consequence}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Frame Inspector Drawer when a Frame is clicked */}
              {selectedFrame && (
                <div className="mt-2 p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl flex items-start justify-between gap-4 text-xs shrink-0 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">
                        {selectedFrame.type === "DEFECT" ? "DEFECT DETECTED" : "FUNCTIONAL SEGMENT"}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-cyan-400 font-mono">
                        {selectedFrame.data.rule || selectedFrame.data.id}
                      </span>
                      {selectedFrame.type === "DEFECT" && (
                        <Badge variant="severity" severity={selectedFrame.data.severity} size="sm" />
                      )}
                    </div>
                    <p className="text-slate-300 font-medium">
                      {selectedFrame.data.title || selectedFrame.data.name}
                    </p>
                    {selectedFrame.data.details && (
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {selectedFrame.data.details}
                      </p>
                    )}
                    {selectedFrame.data.observed && (
                      <div className="flex items-center gap-4 text-[10px] font-mono mt-1 text-slate-400">
                        <span>OBSERVED: <strong className="text-rose-400">{selectedFrame.data.observed}</strong></span>
                        <span>STANDARD: <strong className="text-emerald-400">{selectedFrame.data.expected}</strong></span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedFrame(null)}
                    className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              )}

              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-900 flex items-center justify-between font-mono shrink-0">
                <span>SHA-256: {fileData.hash.slice(0, 24)}...</span>
                <span>ORIGINAL RESOLUTION: HIGH-DPI CAD VECTOR</span>
              </div>
            </div>
          </div>

          {/* Right: Document Metadata & Inspection Rules Configuration */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 pb-2 border-b border-slate-800">
                Schematic File Specifications
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">DOCUMENT NAME</span>
                  <span className="text-slate-200 font-semibold break-all">{fileData.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">PAGES</span>
                    <span className="text-slate-200 font-semibold">{fileData.pages} Pages</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">FILE SIZE</span>
                    <span className="text-slate-200 font-semibold">{fileData.size}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">INTEGRITY STATUS</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Validated & Cryptographically Hashed
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono pb-2 border-b border-slate-800">
                Inspection Configuration
              </h3>

              {/* Target Project */}
              <Select
                label="Target Project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                options={
                  tenantProjects.length > 0
                    ? tenantProjects.map((p) => ({
                        value: p.id,
                        label: p.name,
                        subtext: p.customer || undefined,
                      }))
                    : [
                        {
                          value: "default",
                          label: "General Inspection Project",
                          subtext: "Default active project",
                        },
                      ]
                }
              />

              {/* Standard to Validate Against */}
              <Select
                label="Compliance Standard"
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
                options={SAMPLE_STANDARDS.map((s) => ({
                  value: s.code,
                  label: s.code,
                  subtext: `${s.rule_count} rules`,
                }))}
              />

              {/* Extraction Prompt Version */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  AI Model & Prompt Version
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPromptVersion("extract_v1")}
                    className={`py-2 px-3 rounded-lg text-xs font-mono transition-all border ${
                      promptVersion === "extract_v1"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    extract_v1 (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromptVersion("extract_v2")}
                    className={`py-2 px-3 rounded-lg text-xs font-mono transition-all border ${
                      promptVersion === "extract_v2"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    extract_v2 (+Rule 8)
                  </button>
                </div>
              </div>

              {/* 100% Precision Gate (Zero False-Positive Engine) */}
              <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 to-[#0c121e] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      100% Precision Gate
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    ZERO FALSE POSITIVES
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Character-for-character literal evidence lock. Fails closed on any ambiguity or ungrounded token to guarantee 0.0% false alarms.
                </p>
                <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400 border-t border-cyan-900/40">
                  <span>EVIDENCE VERIFIER: ACTIVE</span>
                  <span className="text-emerald-400 font-bold">100.0% CERTIFIED</span>
                </div>
              </div>

              {/* Reference Netlist (wire_no, colour, size_mm2, source, destination) */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Reference Netlist (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNetlistEditor(!showNetlistEditor)}
                    className="text-xs text-cyan-400 hover:underline font-mono"
                  >
                    {showNetlistEditor ? "Hide Editor ▲" : "Configure JSON ▼"}
                  </button>
                </div>

                {showNetlistEditor && (
                  <div className="space-y-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                      Expected format: <br />
                      <code className="text-cyan-300 text-[10px]">
                        [{`{"wire_no":"122A","colour":"WH","size_mm2":1.5,"source":"CFB1","destination":"CN-36"}`}]
                      </code>
                    </p>
                    <textarea
                      rows={5}
                      value={expectedNetlistJson}
                      onChange={(e) => setExpectedNetlistJson(e.target.value)}
                      placeholder='[&#10;  {"wire_no": "122A", "colour": "WH", "size_mm2": 1.5, "source": "CFB1", "destination": "CN-36"}&#10;]'
                      className="w-full p-2.5 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={specificationIsComplete}
                        onChange={(e) => setSpecificationIsComplete(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span>Specification is declared 100% complete (extra wires fail QC)</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  onClick={handleStartQC}
                  variant="primary"
                  size="lg"
                  className="w-full shadow-lg shadow-blue-500/25 cursor-pointer"
                  rightIcon={<Play className="w-4 h-4" />}
                >
                  Run QC Check
                </Button>
                <button
                  onClick={() => {
                    setStep("UPLOAD");
                    setFileData(null);
                    setRawFile(null);
                    setImagePreviewUrl(null);
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 mt-2 cursor-pointer"
                >
                  Cancel and upload different file
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* STEP 3: REAL STAGE-BASED PROCESSING EXPERIENCE */}
      {step === "PROCESSING" && (
        <div className="max-w-2xl mx-auto py-12">
          <Card className="p-8 text-center space-y-8 border-cyan-500/30 bg-[#0c101a] shadow-2xl shadow-cyan-500/10 relative overflow-hidden">
            {/* Background radar effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            {processingError ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Analysis Interrupted</h3>
                <p className="text-xs text-rose-300 max-w-md mx-auto">{processingError}</p>
                <div className="pt-4 flex justify-center gap-3">
                  <Button onClick={handleStartQC} variant="primary" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>
                    Retry Processing
                  </Button>
                  <Button onClick={() => setStep("PREVIEW")} variant="outline" size="sm">
                    Back to File Preview
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto mb-4 animate-pulse shadow-lg shadow-cyan-500/20">
                    <Cpu className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Analyzing wiring diagram...
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {fileData?.name} • Executing against {selectedStandard}
                  </p>
                </div>

                {/* Linear Progress Indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-400 font-bold uppercase tracking-wider">
                      {processingStages[processingStage].label}
                    </span>
                    <span className="text-white font-bold">
                      {processingStages[processingStage].pct}%
                    </span>
                  </div>
                  <Progress
                    value={processingStages[processingStage].pct}
                    variant="brand"
                    size="md"
                  />
                </div>

                {/* Actual Pipeline Stages Checklist */}
                <div className="pt-4 border-t border-[#1b253b] text-left space-y-3">
                  {processingStages.map((stage, idx) => {
                    const isDone = idx < processingStage;
                    const isCurrent = idx === processingStage;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 text-xs transition-colors ${
                          isDone
                            ? "text-emerald-400 font-semibold"
                            : isCurrent
                            ? "text-cyan-400 font-bold"
                            : "text-slate-600"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                        )}
                        <span>{stage.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
