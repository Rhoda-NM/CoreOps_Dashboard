-- Separate forward migration: the first lifecycle migration has already been rehearsed.
ALTER TABLE "LifecycleJobRun" ADD COLUMN "outcomes" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "LifecycleJobRun" ADD CONSTRAINT "LifecycleJobRun_outcomes_bounded" CHECK (
  jsonb_typeof(outcomes) = 'array' AND jsonb_array_length(outcomes) <= 50
);
