'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const logger = createLogger("app");

interface QRAttendanceProps {
  memberId: string;
  memberName: string;
}

export function QRAttendance({ memberId, memberName }: QRAttendanceProps) {
  const [qrData, setQrData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanTestValue, setScanTestValue] = useState('');

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/attendance/qr?memberId=${memberId}`);
      if (!response.ok) throw new Error('Failed to generate QR code');
      
      const data = await response.json();
      setQrData(data.qrData);
    } catch (error) {
      logger.error('Error generating QR code:', error as Error);
      alert('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const scanQRCode = async (qrCodeData: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/attendance/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: qrCodeData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record attendance');
      }
      
      const data = await response.json();
      setScanResult(data);
      
      // Clear result after 3 seconds
      setTimeout(() => setScanResult(null), 3000);
    } catch (error: unknown) {
      logger.error('Error recording attendance:', error as Error);
      alert(error instanceof Error ? error.message : String(error) || 'Failed to record attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card p-6 rounded-lg shadow border border-border">
        <h3 className="text-lg font-semibold mb-4">QR Code Attendance</h3>
        
        <div className="space-y-4">
          {/* Generate QR Code Section */}
          <div>
            <Button
              type="button"
              onClick={generateQRCode}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate QR Code'}
            </Button>
          </div>

          {/* Display QR Code */}
          {qrData && (
            <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
              <div className="text-center mb-2">
                <p className="font-semibold">{memberName}</p>
                <p className="text-sm text-muted-foreground">Scan this QR code to check in</p>
              </div>
              
              {/* In a real implementation, you would use a QR code library like qrcode.react */}
              <div className="bg-background p-4 rounded flex items-center justify-center min-h-[200px] border border-border">
                <div className="text-center">
                  <div className="text-6xl mb-2">📱</div>
                  <p className="text-sm text-muted-foreground">QR Code would appear here</p>
                  <p className="text-xs text-muted-foreground mt-2">Use a QR code library in production</p>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-muted-foreground break-all">
                <strong>QR Data:</strong> {qrData}
              </div>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className={`p-4 rounded-lg ${
              scanResult.action === 'checkin' 
                ? 'bg-green-500/10 border-2 border-green-500/30 dark:bg-green-500/20' 
                : 'bg-yellow-500/10 border-2 border-yellow-500/30 dark:bg-yellow-500/20'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {scanResult.action === 'checkin' ? '✅' : '👋'}
                </span>
                <div>
                  <p className="font-semibold">{scanResult.message}</p>
                  <p className="text-sm">{scanResult.member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(scanResult.attendance.checkIn)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">How to use:</h4>
            <ol className="text-sm text-foreground space-y-1 list-decimal list-inside">
              <li>Click &quot;Generate QR Code&quot; to create a unique QR code</li>
              <li>Member scans the QR code at the gym entrance</li>
              <li>System automatically records check-in/check-out</li>
              <li>QR code expires after 5 minutes for security</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Quick Scan Input (for testing) */}
      <div className="bg-card p-6 rounded-lg shadow border border-border">
        <h4 className="font-semibold mb-3">Test QR Scan</h4>
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Paste QR data here to test..."
            className="flex-1 p-2 border rounded"
            value={scanTestValue}
            onChange={(e) => setScanTestValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && scanTestValue) {
                scanQRCode(scanTestValue);
                setScanTestValue('');
              }
            }}
          />
          <Button
            type="button"
            onClick={() => {
              if (scanTestValue) {
                scanQRCode(scanTestValue);
                setScanTestValue('');
              }
            }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Scan
          </Button>
        </div>
      </div>
    </div>
  );
}
