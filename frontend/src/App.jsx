import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, Download, ShieldCheck } from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [threshold, setThreshold] = useState(0.7);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.name.endsWith('.docx')) {
        setFile(selected);
        setStatus('idle');
        setResult(null);
        setErrorMsg('');
      } else {
        setErrorMsg('Only .docx files are supported');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      if (dropped.name.endsWith('.docx')) {
        setFile(dropped);
        setStatus('idle');
        setResult(null);
        setErrorMsg('');
      } else {
        setErrorMsg('Only .docx files are supported');
      }
    }
  };

  const handleRedact = async () => {
    if (!file) return;

    setStatus('processing');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('document', file);
    formData.append('threshold', threshold.toString());

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/redact`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process document');
      }

      const data = await response.json();
      setResult(data);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <ShieldCheck className="text-primary-600" size={28} strokeWidth={2} />
          <h1 className="text-xl font-semibold tracking-tight">PII Redaction Tool</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col gap-8">
        
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Redact Sensitive Information</h2>
          <p className="text-slate-500">
            Securely remove Personally Identifiable Information (PII) from your DOCX files.
            The tool replaces identified PII with synthetic data while preserving document formatting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 flex flex-col gap-6">
            
            <div 
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
                file ? 'border-primary-500 bg-primary-50/50' : 'border-slate-300 hover:border-slate-400 bg-white'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
              />
              
              {!file ? (
                <>
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <UploadCloud className="text-slate-500" size={32} />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-1">Upload DOCX File</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-xs">
                    Drag and drop your document here, or click to browse from your computer.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-shadow"
                  >
                    Select File
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="text-primary-600" size={32} />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-1 truncate max-w-xs">{file.name}</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button 
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                      setStatus('idle');
                    }}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700"
                  >
                    Remove and select another file
                  </button>
                </>
              )}
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <span className="text-sm">{errorMsg}</span>
              </div>
            )}

            {status === 'success' && result && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6 text-emerald-800">
                  <CheckCircle size={24} className="text-emerald-600" />
                  <h3 className="text-lg font-semibold">Redaction Complete</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total PII Detected</p>
                    <p className="text-2xl font-bold text-slate-800">{result.summary.totalDetections}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Unique Replacements</p>
                    <p className="text-2xl font-bold text-slate-800">{result.summary.uniqueReplacements}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <a 
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${result.downloadUrl}`}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Download size={18} />
                    Download Redacted DOCX
                  </a>
                  <a 
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${result.reportUrl}`}
                    className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-5 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Download size={18} />
                    Audit Report
                  </a>
                </div>
              </div>
            )}

          </div>

          <div className="md:col-span-1 flex flex-col gap-6 md:flex">
            
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Configuration</h3>
              
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between items-center">
                  <label htmlFor="threshold" className="text-sm font-medium text-slate-700">Confidence Threshold</label>
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">{threshold.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  id="threshold" 
                  min="0.5" 
                  max="0.99" 
                  step="0.01" 
                  value={threshold} 
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Higher threshold reduces false positives but might miss ambiguous PII. Lower threshold captures more but may redact non-sensitive terms.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleRedact}
                  disabled={!file || status === 'processing'}
                  className={`w-full py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm
                    ${!file 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : status === 'processing'
                        ? 'bg-primary-600 text-white cursor-wait opacity-90'
                        : 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow'
                    }
                  `}
                >
                  {status === 'processing' ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Processing Document...
                    </>
                  ) : (
                    'Redact Document'
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl p-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Supported Entities</h4>
              <ul className="text-sm text-slate-600 flex flex-col gap-2">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Personal Names</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Email Addresses</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Phone Numbers</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Company Names</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Physical Addresses</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Financial/ID Numbers</li>
              </ul>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
