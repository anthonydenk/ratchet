import { z } from "zod";
import {
  IdentifierSchema,
  IsoDateTimeSchema,
  SanitizedTextSchema,
  SchemaVersionSchema,
  StringListSchema,
} from "./shared.js";

export const SkillStatusSchema = z.enum([
  "draft",
  "candidate",
  "promoted",
  "retired",
  "quarantined",
]);

export const SkillKindSchema = z.enum([
  "preference",
  "procedure",
  "fact",
  "heuristic",
  "constraint",
]);

export const ProofRunVerdictSchema = z.enum(["pass", "fail"]);

export const ProofRunManifestSchema = z
  .object({
    verifierConfigHash: z.string().min(1),
    models: z
      .array(
        z
          .object({
            role: z.enum(["verifier", "baseline"]),
            id: z.string().min(1),
            seed: z.number().int().optional(),
          })
          .strict(),
      )
      .min(2),
    datasetId: z.string().min(1),
    configHash: z.string().min(1),
    timestamp: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((manifest, context) => {
    const roles = new Set(manifest.models.map((model) => model.role));

    if (!roles.has("verifier")) {
      context.addIssue({
        code: "custom",
        path: ["models"],
        message: "ProofRun manifest must include a verifier model receipt",
      });
    }

    if (!roles.has("baseline")) {
      context.addIssue({
        code: "custom",
        path: ["models"],
        message: "ProofRun manifest must include a baseline model receipt",
      });
    }
  });

export const ProofRunMeasurementSchema = z
  .object({
    baselineScore: z.number(),
    candidateScore: z.number(),
    delta: z.number(),
    trials: z.number().int().nonnegative(),
    significance: z.number(),
    metric: z.string().min(1),
  })
  .strict();

export const ProofRunRegressionSchema = z
  .object({
    skillsChecked: z.number().int().nonnegative(),
    regressions: z.array(
      z
        .object({
          skillId: IdentifierSchema,
          before: z.number(),
          after: z.number(),
        })
        .strict(),
    ),
  })
  .strict();

export const ProofRunRefSchema = z
  .object({
    id: IdentifierSchema,
    verdict: ProofRunVerdictSchema,
    manifest: ProofRunManifestSchema,
    measurement: ProofRunMeasurementSchema,
  })
  .strict();

export const ProofRunSchema = z
  .object({
    id: IdentifierSchema,
    schemaVersion: SchemaVersionSchema,
    skillId: IdentifierSchema,
    verdict: ProofRunVerdictSchema,
    manifest: ProofRunManifestSchema,
    measurement: ProofRunMeasurementSchema,
    regression: ProofRunRegressionSchema,
    dissent: z.string().min(1).optional(),
    costUSD: z.number().nonnegative(),
  })
  .strict()
  .superRefine((proofRun, context) => {
    if (proofRun.verdict === "pass" && proofRun.regression.regressions.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["regression", "regressions"],
        message: "passing ProofRuns must have no regressions",
      });
    }
  });

export const SkillSchema = z
  .object({
    id: IdentifierSchema,
    schemaVersion: SchemaVersionSchema,
    name: SanitizedTextSchema,
    kind: SkillKindSchema,
    status: SkillStatusSchema,
    body: SanitizedTextSchema,
    applicability: z
      .object({
        description: SanitizedTextSchema,
        triggers: StringListSchema.optional(),
        scope: z.enum(["global", "repo", "language", "task"]).optional(),
      })
      .strict(),
    provenance: z
      .object({
        origin: z.enum(["local", "imported"]),
        sourceSessionId: IdentifierSchema.optional(),
        proposerConfigHash: z.string().min(1),
        createdAt: IsoDateTimeSchema,
        createdBy: z.string().min(1),
      })
      .strict(),
    lineage: z
      .object({
        parents: StringListSchema.optional(),
        supersedes: IdentifierSchema.optional(),
        version: z.number().int().positive(),
      })
      .strict(),
    proofs: z.array(ProofRunRefSchema),
    trust: z
      .object({
        promoted: z.boolean(),
        lastVerdict: z.enum(["pass", "fail", "untested"]),
        confidence: z.number().min(0).max(1),
        lastValidatedAt: IsoDateTimeSchema.optional(),
        expiresAt: IsoDateTimeSchema.optional(),
      })
      .strict(),
    conflictsWith: StringListSchema.optional(),
    tags: StringListSchema.optional(),
  })
  .strict()
  .superRefine((skill, context) => {
    for (const proof of skill.proofs) {
      if (proof.manifest.verifierConfigHash === skill.provenance.proposerConfigHash) {
        context.addIssue({
          code: "custom",
          path: ["proofs"],
          message: "proof verifierConfigHash must differ from provenance.proposerConfigHash",
        });
      }
    }

    if (skill.status === "promoted") {
      const hasPassingProof = skill.proofs.some((proof) => proof.verdict === "pass");

      if (!skill.trust.promoted) {
        context.addIssue({
          code: "custom",
          path: ["trust", "promoted"],
          message: "promoted skills must set trust.promoted=true",
        });
      }

      if (skill.trust.lastVerdict !== "pass" || !hasPassingProof) {
        context.addIssue({
          code: "custom",
          path: ["trust", "lastVerdict"],
          message: "promoted skills require a passing proof reference",
        });
      }
    }

    if (skill.status !== "promoted" && skill.trust.promoted) {
      context.addIssue({
        code: "custom",
        path: ["trust", "promoted"],
        message: "only status=promoted may set trust.promoted=true",
      });
    }
  });

export type SkillStatus = z.infer<typeof SkillStatusSchema>;
export type SkillKind = z.infer<typeof SkillKindSchema>;
export type ProofRun = z.infer<typeof ProofRunSchema>;
export type ProofRunRef = z.infer<typeof ProofRunRefSchema>;
export type Skill = z.infer<typeof SkillSchema>;
