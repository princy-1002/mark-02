import React, { useState, useRef } from 'react';
import type { DatasetSummary } from '../../types/modelLab';
import { ModelLabService } from '../../services/modelLabService';
import { Button } from '../common/Button';
import { 
  UploadCloud, 
  FileArchive, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Sparkles, 
  FileImage,
  Database,
  ArrowRight
} from 'lucide-react';

interface DatasetUploadCardProps {
  datasets: DatasetSummary[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onDatasetUploaded: () => void;
  onGoToPrepare: (id: string) => void;
}

export const DatasetUploadCard: React.FC<DatasetUploadCardProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onDatasetUploaded,
  onGoToPrepare,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.zip') {
      setErrorMessage(`Unsupported format '${ext}'. Please upload a .zip archive containing satellite imagery patches and masks.`);
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setErrorMessage(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 200MB limit.`);
      return;
    }

    setSelectedFile(file);
    if (!customName) {
      setCustomName(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setUploadProgress(50);
      const res = await ModelLabService.uploadDataset(selectedFile, customName);
      setUploadProgress(100);
      setSuccessMessage(`Dataset "${res.name}" successfully processed (${res.image_count} images, ${res.mask_count} masks).`);
      setSelectedFile(null);
      setCustomName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onDatasetUploaded();
      onSelectDataset(res.dataset_id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload and validate dataset archive.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (datasetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (datasetId === 'ds-western-ghats-benchmark') {
      alert('The Western Ghats Benchmark is a built-in verified dataset and cannot be deleted.');
      return;
    }

    if (!confirm('Are you sure you want to delete this dataset?')) return;

    try {
      await ModelLabService.deleteDataset(datasetId);
      onDatasetUploaded();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone Card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-teal-500/15">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <UploadCloud size={20} className="text-sky-400" />
              Satellite Dataset Ingestion
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload compressed archive containing satellite imagery tiles (.tif, .png, .jpg) and matching binary canopy-loss masks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-sky-950/70 text-sky-300 border border-sky-400/30">
              ZIP Archive • Max 200MB
            </span>
          </div>
        </div>

        {/* Drag and drop target */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-5 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-sky-400 bg-sky-950/30 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
              : 'border-teal-500/30 hover:border-sky-400/60 bg-[#060c09]/60 hover:bg-[#0c1813]/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-950/60 border border-sky-400/40 flex items-center justify-center text-sky-400 mb-3 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
            <FileArchive size={28} />
          </div>

          <p className="text-sm font-medium text-slate-200">
            {selectedFile ? (
              <span className="text-sky-300 font-mono">{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
            ) : (
              <>Drag & drop dataset <span className="text-sky-400 font-semibold">.ZIP</span> archive here, or <span className="text-sky-400 underline underline-offset-2">browse</span></>
            )}
          </p>

          <p className="text-xs text-slate-400 mt-1.5 font-sans">
            Supported imagery formats inside archive: GeoTIFF/TIFF, PNG, JPEG with companion segmentation masks
          </p>
        </div>

        {/* Selected file configuration and actions */}
        {selectedFile && (
          <div className="mt-4 p-4 rounded-xl bg-[#091410] border border-teal-500/30 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Dataset Display Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Western Ghats Sentinel-2 2026 Batch A"
                className="w-full px-3 py-1.5 bg-[#060b08] border border-teal-500/40 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-400 font-sans"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUploadSubmit}
                isLoading={uploading}
                icon={<UploadCloud size={14} />}
              >
                Validate & Ingest
              </Button>
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span className="text-sky-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                Unpacking, verifying path safety, and extracting raster channels...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-teal-500/30">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-teal-400 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-300 font-sans">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">Validation Error</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-start gap-2.5 text-xs text-emerald-300 font-sans">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p>{successMessage}</p>
          </div>
        )}
      </div>

      {/* Available Datasets Catalog */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold flex items-center gap-2">
            <Database size={14} />
            Available Datasets ({datasets.length})
          </h4>
          <span className="text-[11px] text-slate-400 font-sans">
            Select a dataset to inspect thumbnails, prepare splits, or train
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((ds) => {
            const isSelected = ds.dataset_id === selectedDatasetId;
            const isBenchmark = ds.dataset_id === 'ds-western-ghats-benchmark';

            return (
              <div
                key={ds.dataset_id}
                onClick={() => onSelectDataset(ds.dataset_id)}
                className={`rounded-xl p-4.5 transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#10231c] to-[#0c1914] border-2 border-sky-400/90 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                    : 'bg-[#0a1410]/85 hover:bg-[#0f2019] border border-teal-500/20 hover:border-teal-400/50 shadow-[0_2px_12px_rgba(0,0,0,0.4)]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isBenchmark ? 'bg-sky-950/80 text-sky-300 border border-sky-400/40' : 'bg-teal-950/60 text-teal-300 border border-teal-500/30'}`}>
                        {isBenchmark ? <Sparkles size={16} /> : <FileImage size={16} />}
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-slate-100 group-hover:text-sky-200 transition-colors line-clamp-1">
                          {ds.name}
                        </h5>
                        <p className="text-[10px] font-mono text-slate-400">
                          {ds.dataset_id}
                        </p>
                      </div>
                    </div>

                    {!isBenchmark && (
                      <button
                        onClick={(e) => handleDelete(ds.dataset_id, e)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded-md transition-colors"
                        title="Delete Dataset"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 font-sans leading-relaxed">
                    {ds.description || 'Satellite imagery dataset for forest loss detection.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-teal-500/15 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Rasters</span>
                      <span className="text-slate-200 font-semibold">{ds.image_count} patches</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Ground Truth</span>
                      <span className={ds.has_labels ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                        {ds.has_labels ? `${ds.mask_count} masks` : 'No Masks'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Resolution</span>
                      <span className="text-slate-300">{ds.dimensions || '192x192'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Geo Reference</span>
                      <span className="text-teal-300 truncate block">{ds.crs ? 'EPSG:4326' : 'Pixel Grid'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-teal-500/15 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(ds.created_at).toLocaleDateString()}
                  </span>

                  <Button
                    variant={isSelected ? 'primary' : 'outline'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDataset(ds.dataset_id);
                      onGoToPrepare(ds.dataset_id);
                    }}
                    icon={<ArrowRight size={13} />}
                  >
                    Prepare Dataset
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
