-- AlterTable
ALTER TABLE "NotificationOutbox" ADD COLUMN     "engineeringTransport" TEXT;

-- AlterTable
ALTER TABLE "NotificationProviderEvent" ADD COLUMN     "evidenceProtocol" TEXT NOT NULL DEFAULT 'SYNTHETIC';


-- Never enable actual transport or real legal evidence in N-D.
ALTER TABLE "NotificationOutbox" ADD CHECK ("engineeringTransport" IS NULL OR ("engineeringTransport"='RESEND_HTTP_MOCK' AND simulated AND "providerScope" LIKE 'simulation:%'));
ALTER TABLE "NotificationProviderEvent" ADD CHECK ("evidenceProtocol" IN ('SYNTHETIC','RESEND_SVIX_MOCK') AND ("evidenceProtocol"<>'RESEND_SVIX_MOCK' OR (simulated AND "providerScope" LIKE 'simulation:%')));
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='"NotificationControl"'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%workerLeaseToken%' LOOP EXECUTE format('ALTER TABLE "NotificationControl" DROP CONSTRAINT %I',r.conname); END LOOP;
END $$;
ALTER TABLE "NotificationControl" ADD CHECK (settings='{}'::jsonb AND (("workerLeaseToken" IS NULL)=("workerLeaseUntil" IS NULL)));

CREATE OR REPLACE FUNCTION notification_simulation_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND ROW(OLD."sourceId",OLD."noticeId",OLD."recipientUserId",OLD."logicalKey",OLD.generation,OLD."replacesId",OLD."replacementAuditId",OLD."providerKey",OLD.kind,OLD.channel,OLD."createdAt",OLD."scheduledAt",OLD."latestSendAt",OLD.priority,OLD."recipientPolicyVersion") IS DISTINCT FROM ROW(NEW."sourceId",NEW."noticeId",NEW."recipientUserId",NEW."logicalKey",NEW.generation,NEW."replacesId",NEW."replacementAuditId",NEW."providerKey",NEW.kind,NEW.channel,NEW."createdAt",NEW."scheduledAt",NEW."latestSendAt",NEW.priority,NEW."recipientPolicyVersion") THEN RAISE EXCEPTION 'Immutable logical notification'; END IF;
 IF NEW.simulated AND ((NEW."dispatchedAttempts">0 AND NEW."payloadHash" IS NULL) OR (NEW."providerMessageId" IS NOT NULL AND ((NEW."engineeringTransport" IS NULL AND NEW."providerMessageId"!~'^sim_[a-f0-9]{40}$') OR (NEW."engineeringTransport"='RESEND_HTTP_MOCK' AND NEW."providerMessageId"!~'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')))) THEN RAISE EXCEPTION 'Invalid simulated dispatch evidence'; END IF;
 IF TG_OP='UPDATE' AND OLD."payloadHash" IS NOT NULL AND OLD."engineeringTransport" IS DISTINCT FROM NEW."engineeringTransport" THEN RAISE EXCEPTION 'Immutable engineering transport'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION notification_protocol_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD."evidenceProtocol" IS DISTINCT FROM NEW."evidenceProtocol" THEN RAISE EXCEPTION 'Immutable evidence protocol'; END IF;
 IF NEW."notificationId" IS NOT NULL AND NEW."evidenceProtocol"='RESEND_SVIX_MOCK' AND NOT EXISTS(SELECT 1 FROM "NotificationOutbox" o WHERE o.id=NEW."notificationId" AND o."engineeringTransport"='RESEND_HTTP_MOCK' AND o.simulated) THEN RAISE EXCEPTION 'Mock evidence cannot associate with another transport'; END IF;
 IF NEW."notificationId" IS NOT NULL AND NEW."evidenceProtocol"='SYNTHETIC' AND EXISTS(SELECT 1 FROM "NotificationOutbox" o WHERE o.id=NEW."notificationId" AND o."engineeringTransport" IS NOT NULL) THEN RAISE EXCEPTION 'Synthetic evidence cannot become Resend evidence'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_protocol_guard BEFORE INSERT OR UPDATE ON "NotificationProviderEvent" FOR EACH ROW EXECUTE FUNCTION notification_protocol_guard();
