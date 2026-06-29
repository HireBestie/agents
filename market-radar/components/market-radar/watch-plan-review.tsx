import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DeployStatus } from "@/lib/monitor-form";
import {
  hasRelevantActiveSources,
  type BestieSeedV1,
} from "@/lib/ontology-seed";

type WatchPlanReviewProps = {
  seed: BestieSeedV1;
  deployStatus: DeployStatus | null;
  sourceBacklog: Array<{ kind: string; detail: string; rationale?: string }>;
  needsSourceApproval: boolean;
  onAssumptionChange: (index: number, statement: string) => void;
  onPrincipleChange: (index: number, statement: string) => void;
  onDigestEmailChange: (value: string) => void;
};

function ChecklistRow({
  ok,
  label,
  optional = false,
  detail,
}: {
  ok: boolean;
  label: string;
  optional?: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      {ok ? (
        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-arena-yes" />
      ) : optional ? (
        <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      ) : (
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-arena-watch" />
      )}
      <div>
        <p className="font-medium">
          {label}
          {optional ? (
            <Badge variant="outline" className="ml-2 align-middle text-[10px]">
              optional
            </Badge>
          ) : null}
        </p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

export function WatchPlanReview({
  seed,
  deployStatus,
  sourceBacklog,
  needsSourceApproval,
  onAssumptionChange,
  onPrincipleChange,
  onDigestEmailChange,
}: WatchPlanReviewProps) {
  const emailTarget =
    seed.deliverySeed.destinations.find((item) => item.kind === "email")?.target ??
    "";
  const sourcesReady = hasRelevantActiveSources(seed);
  const infraReady = deployStatus?.infraReady ?? false;
  const emailReady = deployStatus?.emailReady ?? false;

  return (
    <div className="space-y-6">
      <section className="card-editorial space-y-3 p-5">
        <p className="label-arena">Bestie learned</p>
        <p className="font-body-serif text-muted-foreground">
          Review what Bestie inferred. Edit anything that is off. Ontology terms
          stay under each section as subtitles only.
        </p>
      </section>

      <section className="card-editorial space-y-4 p-5">
        <div>
          <p className="label-arena">Watch targets</p>
          <p className="text-xs text-muted-foreground">
            Assumptions — what would change a decision if it moved
          </p>
        </div>
        {seed.worldModelSeed.assumptions.map((assumption, index) => (
          <div key={assumption.id}>
            <Textarea
              value={assumption.statement}
              onChange={(event) => onAssumptionChange(index, event.target.value)}
              className="font-data text-sm"
            />
            {assumption.rationale ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {assumption.rationale}
              </p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="card-editorial space-y-4 p-5">
        <div>
          <p className="label-arena">Escalation rules</p>
          <p className="text-xs text-muted-foreground">
            Principles — when Bestie should interrupt you
          </p>
        </div>
        {seed.worldviewSeed.principles.map((principle, index) => (
          <Textarea
            key={principle.id}
            value={principle.statement}
            onChange={(event) => onPrincipleChange(index, event.target.value)}
            className="font-data text-sm"
          />
        ))}
      </section>

      <section className="card-editorial space-y-3 p-5">
        <div>
          <p className="label-arena">Sources to watch</p>
          <p className="text-xs text-muted-foreground">
            Named feeds, sites, or competitors Bestie will scan
          </p>
        </div>
        {seed.sourceSeed.sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active sources yet. Add competitor or industry URLs before your
            first scan.
          </p>
        ) : null}
        {seed.sourceSeed.sources.map((source) => (
          <div
            key={source.id}
            className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-background/60 px-3 py-2 text-sm"
          >
            <Badge variant="watching">{source.kind}</Badge>
            <span className="font-medium">{source.label}</span>
            <span className="truncate font-data text-xs text-muted-foreground">
              {source.url}
            </span>
          </div>
        ))}
        {sourceBacklog.length > 0 ? (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Suggested sources to add
            </p>
            {sourceBacklog.map((item) => (
              <p key={`${item.kind}:${item.detail}`} className="text-xs">
                <Badge variant="outline" className="mr-2">
                  {item.kind}
                </Badge>
                {item.detail}
              </p>
            ))}
          </div>
        ) : null}
        {needsSourceApproval ? (
          <Alert>
            <AlertDescription>
              Coverage stays partial until you add relevant watch sources. Bestie
              will not auto-add generic news feeds.
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="card-editorial space-y-3 p-5">
        <div>
          <p className="label-arena">Delivery</p>
          <p className="text-xs text-muted-foreground">
            Where digests land — web digest is always available
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          After your first scan, open the Digest tab even if email is not wired
          yet.
        </p>
        <div className="space-y-2">
          <Label htmlFor="digest-email">Email inbox (optional)</Label>
          <Input
            id="digest-email"
            type="email"
            placeholder="ops@yourcompany.com"
            value={emailTarget}
            onChange={(event) => onDigestEmailChange(event.target.value)}
          />
        </div>
      </section>

      <section className="card-editorial space-y-4 p-5">
        <p className="label-arena">Launch checklist</p>
        <div className="space-y-3">
          <ChecklistRow
            ok={sourcesReady}
            label="At least one relevant watch source"
            detail={
              sourcesReady
                ? undefined
                : "Add a named competitor URL or feed before running."
            }
          />
          <ChecklistRow
            ok={infraReady}
            label="AI, memory, and schedule connected"
            detail={
              infraReady
                ? undefined
                : "Finish the system checklist on Welcome before the first scan."
            }
          />
          <ChecklistRow
            ok={emailReady || Boolean(emailTarget.trim())}
            label="Email delivery"
            optional
            detail={
              emailReady
                ? "Resend is configured."
                : "Skip for now — use the web digest after your first scan."
            }
          />
        </div>
      </section>
    </div>
  );
}

export function canLaunchFirstScan(
  seed: BestieSeedV1,
  deployStatus: DeployStatus | null,
): boolean {
  return hasRelevantActiveSources(seed) && (deployStatus?.infraReady ?? false);
}
