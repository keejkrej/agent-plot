"use client";

import { useEffect, useId, useState } from "react";
import { Settings2Icon, SparklesIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  readSessionContext,
  writeSessionContext,
  prepareTitanicExample,
} from "@/app/_actions/session";

export function SessionSetup({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState({
    experimentalGoal: "",
    scientificBackground: "",
    preferredOutputFormat: "",
  });
  const [dataFolder, setDataFolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const goalId = useId();
  const backgroundId = useId();
  const formatId = useId();
  const folderId = useId();

  useEffect(() => {
    if (!open || !sessionId) return;
    let active = true;
    readSessionContext(sessionId).then((ctx) => {
      if (!active || !ctx) return;
      setContext({
        experimentalGoal: ctx.experimentalGoal ?? "",
        scientificBackground: ctx.scientificBackground ?? "",
        preferredOutputFormat: ctx.preferredOutputFormat ?? "",
      });
      setDataFolder(ctx.dataFolder ?? "");
    });
    return () => {
      active = false;
    };
  }, [open, sessionId]);

  const handleSave = async () => {
    if (!sessionId) return;
    setSaving(true);
    const result = await writeSessionContext(sessionId, {
      ...context,
      // Store the local data folder in the session context so the assistant can see it.
      dataFolder: dataFolder.trim() || undefined,
    });
    setSaving(false);
    setMessage(result.ok ? "Saved." : `Save failed: ${result.error}`);
    if (result.ok) {
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handlePrepareTitanic = async () => {
    if (!sessionId) return;
    setPreparing(true);
    const result = await prepareTitanicExample();
    setPreparing(false);
    if (result.ok && result.folder) {
      setDataFolder(result.folder);
      setMessage(`Titanic example ready at ${result.folder}. Click Save context to use it.`);
    } else {
      setMessage(`Setup failed: ${result.error}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings2Icon className="mr-2 size-4" />
          Session setup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Session setup</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor={goalId}>
              Experimental goal
            </label>
            <Textarea
              id={goalId}
              placeholder="What are you trying to measure or discover?"
              rows={2}
              value={context.experimentalGoal}
              onChange={(e) =>
                setContext((c) => ({ ...c, experimentalGoal: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor={backgroundId}>
              Scientific background
            </label>
            <Textarea
              id={backgroundId}
              placeholder="Domain, organism, instrument, prior hypotheses…"
              rows={3}
              value={context.scientificBackground}
              onChange={(e) =>
                setContext((c) => ({ ...c, scientificBackground: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor={formatId}>
              Preferred output format
            </label>
            <Input
              id={formatId}
              placeholder="e.g. PNG + CSV summary"
              value={context.preferredOutputFormat}
              onChange={(e) =>
                setContext((c) => ({ ...c, preferredOutputFormat: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor={folderId}>
              Local data folder
            </label>
            <Input
              id={folderId}
              placeholder="/absolute/path/to/experiment/data"
              value={dataFolder}
              onChange={(e) => setDataFolder(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              The assistant will read files from this path. Leave blank to use the session data folder.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={saving || !sessionId}
              onClick={handleSave}
              size="sm"
            >
              {saving ? "Saving…" : "Save context"}
            </Button>
            <Button
              disabled={preparing || !sessionId}
              onClick={handlePrepareTitanic}
              size="sm"
              variant="secondary"
            >
              <SparklesIcon className="mr-2 size-4" />
              {preparing ? "Preparing…" : "Prepare Titanic example"}
            </Button>
          </div>
          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
