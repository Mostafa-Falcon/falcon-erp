/**
 * 🦅 FALCON ERP - THERMAL PRINTER & BLUETOOTH ESC/POS ENGINE
 * Handles:
 * 1. Desktop USB Thermal Printers via System/Kiosk Spooler
 * 2. Mobile Bluetooth 58mm/80mm Thermal Printers via Web Bluetooth API
 * 3. Printer Status Detection & Persistence
 */

export interface PrinterConfig {
  printerName: string;
  connectionType: 'usb_driver' | 'bluetooth' | 'browser_dialog';
  paperSize: '80mm (حراري)' | '58mm (حراري)' | 'A4 (ورق عادي)' | 'A5 (ورق متوسط)';
  bluetoothDeviceId?: string;
  bluetoothDeviceName?: string;
  autoPrintOnApproval: boolean;
  status: 'connected' | 'disconnected' | 'ready';
}

// In-Memory Bluetooth Device & Characteristic Cache
let btDevice: any = null;
let btCharacteristic: any = null;

/**
 * Check if Web Bluetooth API is supported on the current device
 */
export function isBluetoothSupported(): boolean {
  return typeof window !== 'undefined' && 'navigator' in window && 'bluetooth' in (navigator as any);
}

/**
 * Connect / Pair with a Bluetooth Thermal Printer (Mobile / Android / Tablet / Desktop)
 */
export async function connectBluetoothPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      error: 'تقنية البلوتوث (Web Bluetooth API) غير مدعومة على هذا المتصفح. يرجى استخدام متصفح Chrome أو Edge الحديث على الموبايل أو الكمبيوتر.',
    };
  }

  try {
    const nav = navigator as any;
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard Serial / Printer Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '00001101-0000-1000-8000-00805f9b34fb',
      ],
    });

    if (!device) {
      return { success: false, error: 'لم يتم اختيار طابعة بلوتوث.' };
    }

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    let characteristic: any = null;
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          characteristic = char;
          break;
        }
      }
      if (characteristic) break;
    }

    btDevice = device;
    btCharacteristic = characteristic;

    // Listen for disconnection
    device.addEventListener('gattserverdisconnected', () => {
      btDevice = null;
      btCharacteristic = null;
    });

    return {
      success: true,
      deviceName: device.name || 'طابعة بلوتوث حرارية',
    };
  } catch (err: any) {
    console.error('Bluetooth printer connection error:', err);
    return {
      success: false,
      error: err?.message || 'فشل الاقتران بطابعة البلوتوث.',
    };
  }
}

/**
 * Get current Bluetooth printer connection status
 */
export function getBluetoothPrinterStatus(): { isConnected: boolean; deviceName: string } {
  const isConnected = Boolean(btDevice && btDevice.gatt && btDevice.gatt.connected);
  return {
    isConnected,
    deviceName: isConnected ? btDevice?.name || 'طابعة بلوتوث حرارية' : 'غير متصلة',
  };
}

/**
 * Convert text string into ESC/POS UTF-8 byte array for Bluetooth printing
 */
export function encodeEscPosText(text: string): Uint8Array {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text + '\n');

  // ESC/POS commands: Initialize (ESC @), Set Arabic code page if supported, Cut paper (GS V 66 0)
  const initCmd = new Uint8Array([0x1b, 0x40]); // ESC @
  const cutCmd = new Uint8Array([0x1d, 0x56, 0x42, 0x00]); // GS V 66 0

  const totalLength = initCmd.length + textBytes.length + cutCmd.length;
  const result = new Uint8Array(totalLength);
  result.set(initCmd, 0);
  result.set(textBytes, initCmd.length);
  result.set(cutCmd, initCmd.length + textBytes.length);

  return result;
}

/**
 * Send raw print payload over Bluetooth to the paired thermal printer
 */
export async function sendBluetoothPrintPayload(payload: Uint8Array): Promise<boolean> {
  if (!btCharacteristic || !btDevice || !btDevice.gatt || !btDevice.gatt.connected) {
    return false;
  }

  try {
    const chunkSize = 100;
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      if (btCharacteristic.writeValueWithoutResponse) {
        await btCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await btCharacteristic.writeValue(chunk);
      }
    }
    return true;
  } catch (err) {
    console.error('Bluetooth print error:', err);
    return false;
  }
}

/**
 * Trigger print operation (uses Bluetooth if connected, otherwise opens Web/Kiosk thermal print dialog)
 */
export async function executeThermalPrint(receiptText?: string): Promise<{ mode: 'bluetooth' | 'browser'; success: boolean }> {
  if (btCharacteristic && btDevice && btDevice.gatt && btDevice.gatt.connected && receiptText) {
    const payload = encodeEscPosText(receiptText);
    const ok = await sendBluetoothPrintPayload(payload);
    if (ok) return { mode: 'bluetooth', success: true };
  }

  // Fallback to Web Browser / Kiosk Spooler print
  if (typeof window !== 'undefined') {
    window.print();
    return { mode: 'browser', success: true };
  }

  return { mode: 'browser', success: false };
}
