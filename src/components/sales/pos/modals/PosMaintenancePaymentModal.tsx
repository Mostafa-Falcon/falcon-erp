'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wrench, Search, Loader2, Phone, User, Smartphone, CheckCircle2 } from 'lucide-react';
import { db } from '@/core/db/app_database';
import { formatNumber } from '@/lib/format';
import type { MaintenanceTicket } from '@/types';

interface PosMaintenancePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onSelectTicket: (ticket: MaintenanceTicket) => void;
}

export function PosMaintenancePaymentModal({
  isOpen,
  onClose,
  orgId,
  onSelectTicket,
}: PosMaintenancePaymentModalProps) {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !orgId) {
      setTickets([]);
      setSearchQuery('');
      return;
    }

    let isMounted = true;
    const loadTickets = async () => {
      setIsLoading(true);
      try {
        const list = await db.maintenance_tickets
          .where('org_id')
          .equals(orgId)
          .filter((t) => t.remaining_amount > 0)
          .reverse()
          .toArray();

        if (isMounted) setTickets(list);
      } catch (err) {
        console.error('Error loading unpaid maintenance tickets:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTickets();
    return () => {
      isMounted = false;
    };
  }, [isOpen, orgId]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tickets;

    return tickets.filter((t) => {
      return (
        t.ticket_number.toLowerCase().includes(q) ||
        t.customer_name.toLowerCase().includes(q) ||
        t.customer_phone.includes(q) ||
        t.device_model.toLowerCase().includes(q)
      );
    });
  }, [tickets, searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6 rounded-3xl bg-surface text-right" dir="rtl">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-black flex items-center gap-2 text-amber-600">
            <Wrench className="w-5 h-5 text-amber-500" />
            <span>بحث وتحصيل تكلفة إذن صيانة</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم التكت، رقم هاتف العميل، أو نوع الجهاز..."
              className="pr-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-semibold"
            />
          </div>

          {isLoading ? (
            <div className="py-10 text-center font-bold text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span>جاري التفتيش عن الصيانة غير المسددة...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-10 text-center font-bold text-slate-400">
              لا توجد أذونات صيانة مستحقة التحصيل مطابقة للبحث
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectTicket(t);
                    onClose();
                  }}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface hover:border-amber-500 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-1">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-amber-600 block">
                      #{t.ticket_number} — {t.device_model}
                    </span>
                    <span className="text-2xs text-slate-500 block font-medium">
                      العميل: {t.customer_name} ({t.customer_phone})
                    </span>
                  </div>

                  <div className="text-left font-mono">
                    <span className="font-black text-amber-600 text-sm block">
                      {formatNumber(t.remaining_amount)} ج.م
                    </span>
                    <span className="text-3xs text-slate-400 block font-bold">مستحق التحصيل</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
