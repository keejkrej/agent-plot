"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingsIcon } from "lucide-react";

type SessionContext = {
  experimentalGoal?: string;
  scientificBackground?: string;
  preferredOutputFormat?: string;
};

export function SessionContextDialog({ sessionId }: { sessionId: string | null }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<SessionContext>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId || !open) return;
    fetch(`/api/sessions/${sessionId}/context`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => setContext(data as SessionContext))
      .catch(() => setContext({}));
  }, [sessionId, open]);

  const save = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await fetch(`/api/sessions/${sessionId}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [sessionId, context]);

  if (!sessionId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button aria-label="Session context" size="xs" variant="outline"><SettingsIcon className="size-3" /></Button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Session context</DialogTitle>
          <DialogDescription>
            Tell the assistant about your experiment so it can tailor the analysis.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal">Experimental goal</Label>
            <Textarea
              id="goal"
              placeholder="e.g. Compare intensity profiles across three samples"
              rows={3}
              value={context.experimentalGoal ?? ""}
              onChange={(e) =>
                setContext((prev) => ({ ...prev, experimentalGoal: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="background">Scientific background</Label>
            <Textarea
              id="background"
              placeholder="e.g. Fluorescence microscopy of HeLa cells"
              rows={3}
              value={context.scientificBackground ?? ""}
              onChange={(e) =>
                setContext((prev) => ({ ...prev, scientificBackground: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="format">Preferred output format</Label>
            <Textarea
              id="format"
              placeholder="e.g. Tables and line plots saved as CSV/PNG"
              rows={2}
              value={context.preferredOutputFormat ?? ""}
              onChange={(e) =>
                setContext((prev) => ({ ...prev, preferredOutputFormat: e.target.value }))
              }
            />
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm">Cancel</Button>} />
          <Button size="sm" onClick={save} disabled={loading}>
            {loading ? "Saving..." : "Save context"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
