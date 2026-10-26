import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { AlertOctagon, X, ShieldAlert } from 'lucide-react';

interface EmergencyStopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyStopModal: React.FC<EmergencyStopModalProps> = ({ isOpen, onClose }) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('');
  const { triggerEmergencyHalt, emergencyHaltActive, clearEmergencyHalt } = useAppStore();

  if (!isOpen) return null;

  const handleTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationText.trim().toUpperCase() !== 'HALT') return;
    triggerEmergencyHalt(reason || 'Operator triggered manual kill switch');
    setConfirmationText('');
    setReason('');
    onClose();
  };

  const handleResume = () => {
    clearEmergencyHalt();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border-2 border-rose-600 rounded-xl shadow-2xl shadow-rose-950/50">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-500">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {emergencyHaltActive ? 'System Emergency Halt Active' : 'Emergency Stop All Automation'}
            </h3>
            <p className="text-xs text-rose-400 font-mono">Immediate Global Execution Kill Switch</p>
          </div>
        </div>

        {emergencyHaltActive ? (
          <div className="space-y-4">
            <div className="p-3 rounded bg-rose-950/40 border border-rose-700 text-rose-200 text-xs">
              All automated Tier 0 and Tier 1 connectors are currently frozen. No automatic remediation actions will be executed.
            </div>
            <button
              type="button"
              onClick={handleResume}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-lg text-sm transition-colors"
            >
              Resume Standard Approval Mode Operations
            </button>
          </div>
        ) : (
          <form onSubmit={handleTrigger} className="space-y-4 text-xs">
            <p className="text-slate-300 leading-relaxed">
              Activating the emergency stop will instantly terminate any running connectors, reject all pending automated tasks, and lock down AegisCore into a manual-only read-only freeze.
            </p>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Justification / Incident ID (Mandatory for Audit):</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Suspected connector malfunction or unintended blast radius"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-rose-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Type <span className="font-mono text-rose-400 font-bold">HALT</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="HALT"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-rose-500 font-mono tracking-widest text-center uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={confirmationText.trim().toUpperCase() !== 'HALT'}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950"
              >
                <ShieldAlert className="w-4 h-4" />
                EXECUTE EMERGENCY STOP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
