'use client';

import { useState } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailAddressId: string;
  fromAddress: string;
  // Reply mode
  replyThreadId?: string;
  replyInReplyTo?: string;
  replySubject?: string;
  replyTo?: string;
  onSent?: () => void;
}

export function ComposeDialog({
  open,
  onOpenChange,
  emailAddressId,
  fromAddress,
  replyThreadId,
  replyInReplyTo,
  replySubject,
  replyTo,
  onSent,
}: ComposeDialogProps) {
  const { community } = useCommunity();
  const [to, setTo] = useState(replyTo || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(replySubject || '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  const isReply = !!replyThreadId;

  async function handleSend() {
    if (!to.trim() || !subject.trim()) {
      toast.error('To and Subject are required');
      return;
    }

    setSending(true);

    try {
      // Parse to/cc addresses (comma-separated)
      const toAddresses = to
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      const ccAddresses = cc
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      // Convert plain text to basic HTML
      const bodyHtml = `<div>${body.replace(/\n/g, '<br/>')}</div>`;

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAddressId,
          communityId: community.id,
          to: toAddresses,
          cc: ccAddresses.length ? ccAddresses : undefined,
          subject,
          bodyHtml,
          bodyText: body,
          threadId: replyThreadId || undefined,
          inReplyTo: replyInReplyTo || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to send email');
        return;
      }

      toast.success('Email sent');
      onOpenChange(false);
      resetForm();
      onSent?.();
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  }

  function resetForm() {
    setTo(replyTo || '');
    setCc('');
    setSubject(replySubject || '');
    setBody('');
    setShowCc(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isReply ? 'Reply' : 'New Email'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-3 py-2 overflow-y-auto">
          {/* From (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-label">From</Label>
            <Input value={fromAddress} disabled className="opacity-60" />
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-label">To</Label>
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-meta text-secondary-400 hover:underline"
                >
                  CC
                </button>
              )}
            </div>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          {/* CC */}
          {showCc && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-label">CC</Label>
                <button
                  type="button"
                  onClick={() => {
                    setShowCc(false);
                    setCc('');
                  }}
                  className="text-meta text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-label">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-label">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={10}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !to.trim() || !subject.trim()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
